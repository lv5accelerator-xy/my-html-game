'use strict';
// Runs tests/v3-browser.test.js as V3_SHARDS parallel processes (default: CPU count, 2..4) with
// the current environment (e.g. V3_BROWSER_ENGINE=webkit) and checks every declared flow ran once.
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const requested = Number(process.env.V3_SHARDS);
const count = Number.isInteger(requested) && requested >= 1 ? requested : Math.min(4, Math.max(2, cpus));

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
  const results = await Promise.all(Array.from({ length: count }, (_, i) => shard(i)));
  const declared = new Set(results.map(r => r.report && r.report.declared));
  const flows = results.reduce((sum, r) => sum + (r.report ? r.report.flows : 0), 0);
  const ok = results.every(r => r.status === 0 && r.report) && declared.size === 1 && flows === [...declared][0];
  console.log(`V3_SHARDS: ${JSON.stringify({ engine: process.env.V3_BROWSER_ENGINE || 'chromium', shards: count, flows, declared: [...declared], ok })}`);
  process.exitCode = ok ? 0 : 1;
})();
