'use strict';
// Static checks for shipped game scripts. Catches calls to functions that do not exist,
// which browser tests only see when a flow happens to reach that line.
// Requires eslint@9.39.5 and globals@17.14.0: set CODEX_ESLINT_PATH to the eslint
// module directory, or install both into ./node_modules (npm install --no-save).
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const SHIPPED = Object.freeze([
  'game.js', 'game-math.js', 'cloud-save.js', 'v2-systems.js', 'legacy-systems.js',
  'v3/data.js', 'v3/engine.js', 'v3/storage.js', 'v3/visuals.js', 'v3/motion.js', 'v3/music.js', 'v3/app.js',
]);

function resolveTools() {
  const eslintEntry = process.env.CODEX_ESLINT_PATH
    ? require.resolve(process.env.CODEX_ESLINT_PATH)
    : require.resolve('eslint', { paths: [root] });
  const globalsEntry = require.resolve('globals', { paths: [path.dirname(eslintEntry), root] });
  return { ESLint: require(eslintEntry).ESLint, globals: require(globalsEntry) };
}

function config(globals) {
  return [{
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      // Each shipped file is a classic browser script; firebase comes from the CDN SDK in index.html.
      // module/require: shared rule files export to Node tests behind `typeof module` guards.
      globals: { ...globals.browser, firebase: 'readonly', module: 'readonly', require: 'readonly' },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-dupe-else-if': 'error',
      'no-func-assign': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-constant-binary-expression': 'error',
      'no-compare-neg-zero': 'error',
      'no-loss-of-precision': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  }];
}

async function main() {
  const { ESLint, globals } = resolveTools();
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config(globals) });

  // Canary: a misconfigured setup (e.g. everything treated as global) must not pass silently.
  const [canary] = await eslint.lintText(
    'function confirmChoice() { state.done = true; playClickSound(); render(); }\nwindow.confirmChoice = confirmChoice;\n',
    { filePath: path.join(root, 'canary.js') },
  );
  const caught = canary.messages.filter((m) => m.ruleId === 'no-undef').map((m) => m.message.match(/'(\w+)'/)?.[1]).sort();
  if (JSON.stringify(caught) !== JSON.stringify(['playClickSound', 'render', 'state'])) {
    console.error(`LINT canary failed: expected undefined playClickSound/render/state, got ${JSON.stringify(caught)}`);
    process.exit(1);
  }

  const files = process.argv.slice(2).length ? process.argv.slice(2) : SHIPPED;
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) console.log(output);
  const ignored = results.filter((r) => r.messages.some((m) => !m.ruleId && /ignored/i.test(m.message)));
  if (ignored.length) console.error(`LINT ignored files: ${ignored.map((r) => r.filePath).join(', ')}`);
  const errors = results.reduce((sum, r) => sum + r.errorCount, 0) + ignored.length;
  console.log(`LINT: ${results.length} files, ${errors} errors (eslint ${ESLint.version}; canary ok)`);
  process.exitCode = errors ? 1 : 0;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
