'use strict';
// Runs tests/v3-browser.test.js as V3_SHARDS parallel processes (default: CPU count, 2..4) with
// the current environment (e.g. V3_BROWSER_ENGINE=webkit) and checks every declared flow ran once.
// `--only i/n` runs a single shard (one per CI machine) and checks it ran exactly its share:
// flows with index % n === i, so n machines together cover all declared flows once.
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? /^(\d+)\/(\d+)$/.exec(process.argv[onlyArg + 1] || '') : null;
if (onlyArg > 0 && (!only || Number(only[1]) >= Number(only[2]))) { console.error('Usage: --only i/n with 0 <= i < n'); process.exit(2); }
const requested = Number(process.env.V3_SHARDS);
const count = only ? Number(only[2]) : Number.isInteger(requested) && requested >= 1 ? requested : Math.min(4, Math.max(2, cpus));

function shard(index) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, ['tests/v3-browser.test.js'], { cwd: root, env: { ...process.env, V3_SHARD: `${index}/${count}` } });
    const chunks = [];
    child.stdout.on('data', c => chunks.push(c));
    child.stderr.on('data', c => chunks.push(c));
    const timer = setTimeout(() => child.kill('SIGKILL'), 600000);
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks).toString('utf8');
      console.log(`\n===== v3-browser shard ${index}/${count} (exit ${status}${signal ? ` ${signal}` : ''}, ${Math.round((Date.now() - started) / 1000)}s) =====`);
      process.stdout.write(output);
      const m = /V3_SHARD_RESULT (\{.*\})/.exec(output);
      resolve({ status, report: m ? JSON.parse(m[1]) : null });
    });
  });
}

(async () => {
  if (only) {
    const index = Number(only[1]);
    const { status, report } = await shard(index);
    // Flows are assigned by declaration index, so this shard's share is fixed by the total.
    const expected = report ? Math.floor((report.declared - 1 - index) / count) + 1 : null;
    const ok = status === 0 && report !== null && report.flows === expected;
    console.log(`V3_SHARDS: ${JSON.stringify({ engine: process.env.V3_BROWSER_ENGINE || 'chromium', shard: `${index}/${count}`, flows: report && report.flows, expected, declared: report && report.declared, ok })}`);
    process.exitCode = ok ? 0 : 1;
    return;
  }
  const results = await Promise.all(Array.from({ length: count }, (_, i) => shard(i)));
  const declared = new Set(results.map(r => r.report && r.report.declared));
  const flows = results.reduce((sum, r) => sum + (r.report ? r.report.flows : 0), 0);
  const ok = results.every(r => r.status === 0 && r.report) && declared.size === 1 && flows === [...declared][0];
  console.log(`V3_SHARDS: ${JSON.stringify({ engine: process.env.V3_BROWSER_ENGINE || 'chromium', shards: count, flows, declared: [...declared], ok })}`);
  process.exitCode = ok ? 0 : 1;
})();
