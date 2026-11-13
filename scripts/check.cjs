'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!process.env.CODEX_PLAYWRIGHT_PATH) {
  console.error('Set CODEX_PLAYWRIGHT_PATH to an installed Playwright module before running browser checks.');
  process.exit(1);
}
try { require(process.env.CODEX_PLAYWRIGHT_PATH); } catch (error) {
  console.error(`Playwright unavailable: ${error.message}`); process.exit(1);
}
const scripts = ['game.js','game-math.js','cloud-save.js','v2-systems.js','legacy-systems.js',
  'v3/data.js','v3/engine.js','v3/storage.js','v3/visuals.js','v3/motion.js','v3/music.js','v3/cloud-core.js','v3/cloud.js','v3/app.js'];
const tests = fs.readdirSync(path.join(root,'tests')).filter(file => file.endsWith('.test.js')).sort();
if (!tests.length) throw new Error('No test scripts discovered');
let failed = 0;
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true, timeout: args[0] === 'tests/v3-browser.test.js' ? 600000 : 300000 });
  console.log(`CHECK_RESULT: ${JSON.stringify({ command: ['node', ...args].join(' '), exit: result.status, signal: result.signal, error: result.error?.message || null })}`);
  if (result.error || result.status !== 0) {
    failed++; console.error(`FAILED: node ${args.join(' ')}`, result.error?.message || `exit ${result.status}`);
  }
}
for (const script of scripts) run(['--check',script]);
// Static lint (undefined functions/variables and similar). Needs eslint+globals installed;
// without them it is reported as skipped, never as passed.
let lint = 'skipped';
try {
  if (process.env.CODEX_ESLINT_PATH) require.resolve(process.env.CODEX_ESLINT_PATH);
  else require.resolve('eslint', { paths: [root] });
  const before = failed; run(['scripts/lint.cjs', ...scripts]); lint = failed === before ? 'passed' : 'failed';
} catch (_) {
  console.log('LINT_SKIPPED: eslint not installed (npm install --no-save eslint@9.39.5 globals@17.14.0, or set CODEX_ESLINT_PATH)');
}
for (const test of tests) run([`tests/${test}`]);
console.log(`RESULT: ${scripts.length} syntax checks, lint ${lint}, ${tests.length} test scripts, ${failed} failed checks.`);
process.exitCode = failed ? 1 : 0;
