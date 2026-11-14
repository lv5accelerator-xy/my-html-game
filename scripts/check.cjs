'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!process.env.CODEX_PLAYWRIGHT_PATH) {
  console.error('Set CODEX_PLAYWRIGHT_PATH to an installed Playwright module before running browser checks.');
  process.exit(1);
}
try { require(process.env.CODEX_PLAYWRIGHT_PATH); } catch (error) {
  console.error(`Playwright unavailable: ${error.message}`); process.exit(1);
}
const scripts = ['game.js','game-math.js','cloud-save.js','v2-systems.js','legacy-systems.js',
  'v3/data.js','v3/engine.js','v3/storage.js','v3/visuals.js','v3/motion.js','v3/music.js','v3/app.js'];
const tests = fs.readdirSync(path.join(root,'tests')).filter(file => file.endsWith('.test.js')).sort();
if (!tests.length) throw new Error('No test scripts discovered');

// Parallelism: CHECK_JOBS (default: CPU count, 2..4). v3-browser is split into CHECK_V3_SHARDS
// processes (default: same as jobs); CHECK_JOBS=1 restores the original serial order.
const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const intEnv = (name, fallback) => { const v = Number(process.env[name]); return Number.isInteger(v) && v >= 1 ? v : fallback; };
const jobs = intEnv('CHECK_JOBS', Math.min(4, Math.max(2, cpus)));
const v3Shards = jobs === 1 ? 1 : intEnv('CHECK_V3_SHARDS', jobs);
const V3 = 'v3-browser.test.js';

let failed = 0;
const record = (command, status, signal, error, seconds) => {
  console.log(`CHECK_RESULT: ${JSON.stringify({ command, exit: status, signal, error, seconds: Number(seconds.toFixed(1)) })}`);
  if (error || status !== 0) { failed++; console.error(`FAILED: ${command}`, error || `exit ${status}`); }
};
function runSync(args) {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 300000 });
  record(['node', ...args].join(' '), result.status, result.signal, result.error?.message || null, (Date.now() - started) / 1000);
}
// Parallel tasks buffer their output and print it in one block when they finish.
function runTask(task) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, task.args, { cwd: root, env: { ...process.env, ...task.env }, windowsHide: true });
    const chunks = [];
    child.stdout.on('data', c => chunks.push(c));
    child.stderr.on('data', c => chunks.push(c));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, task.timeout);
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks).toString('utf8');
      console.log(`\n===== ${task.label} =====`);
      process.stdout.write(output.endsWith('\n') || !output ? output : `${output}\n`);
      record(task.label, status, signal, timedOut ? `timed out after ${task.timeout / 1000}s` : null, (Date.now() - started) / 1000);
      resolve({ task, status, output });
    });
    child.on('error', error => { clearTimeout(timer); record(task.label, null, null, error.message, (Date.now() - started) / 1000); resolve({ task, status: null, output: '' }); });
  });
}
async function pool(tasks, size) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (next < tasks.length) results.push(await runTask(tasks[next++]));
  }));
  return results;
}

async function main() {
  const started = Date.now();
  for (const script of scripts) runSync(['--check', script]);
  // Static lint (undefined functions/variables and similar). Needs eslint+globals installed;
  // without them it is reported as skipped, never as passed.
  let lint = 'skipped';
  try {
    if (process.env.CODEX_ESLINT_PATH) require.resolve(process.env.CODEX_ESLINT_PATH);
    else require.resolve('eslint', { paths: [root] });
    const before = failed; runSync(['scripts/lint.cjs', ...scripts]); lint = failed === before ? 'passed' : 'failed';
  } catch (_) {
    console.log('LINT_SKIPPED: eslint not installed (npm install --no-save eslint@9.39.5 globals@17.14.0, or set CODEX_ESLINT_PATH)');
  }

  // v3-browser shards (controlled clock, stable under load) and pure-Node tests run in parallel.
  // Other browser tests use real time, so they run afterwards one at a time, as before.
  const realtimeBrowser = test => test !== V3 && fs.readFileSync(path.join(root, 'tests', test), 'utf8').includes('CODEX_PLAYWRIGHT_PATH');
  const tasks = [], serial = [];
  if (tests.includes(V3)) {
    for (let i = 0; i < v3Shards; i++) {
      const env = v3Shards > 1 ? { V3_SHARD: `${i}/${v3Shards}` } : {};
      tasks.push({ label: v3Shards > 1 ? `node tests/${V3} [shard ${i}/${v3Shards}]` : `node tests/${V3}`, args: [`tests/${V3}`], env, timeout: 600000, shard: v3Shards > 1 });
    }
  }
  for (const test of tests) {
    if (test === V3) continue;
    (realtimeBrowser(test) ? serial : tasks).push({ label: `node tests/${test}`, args: [`tests/${test}`], env: {}, timeout: 300000 });
  }
  const results = await pool(tasks, jobs);
  for (const task of serial) results.push(await runTask(task));

  // Every declared v3 flow must have run exactly once across the shards.
  const shardResults = results.filter(r => r.task.shard);
  if (shardResults.length && !process.env.V3_TEST_FILTER) {
    const reports = shardResults.map(r => { const m = /V3_SHARD_RESULT (\{.*\})/.exec(r.output); return m ? JSON.parse(m[1]) : null; });
    const declared = new Set(reports.map(r => r && r.declared));
    const flows = reports.reduce((sum, r) => sum + (r ? r.flows : 0), 0);
    const complete = reports.every(Boolean) && declared.size === 1 && flows === [...declared][0];
    console.log(`V3_SHARDS: ${JSON.stringify({ shards: shardResults.length, flows, declared: [...declared] })}`);
    if (!complete) { failed++; console.error('FAILED: v3-browser shards did not cover every declared flow exactly once'); }
  }
  console.log(`RESULT: ${scripts.length} syntax checks, lint ${lint}, ${tests.length} test scripts, ${failed} failed checks. (${jobs} jobs, v3-browser in ${v3Shards} shard${v3Shards > 1 ? 's' : ''}, ${serial.length} real-time browser tests serial, ${Math.round((Date.now() - started) / 1000)}s)`);
  process.exitCode = failed ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
