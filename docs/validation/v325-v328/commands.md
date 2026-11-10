# v3.25～v3.28 实际命令索引

公共前缀：Node22.23.4所在PATH、CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright、CODEX_CHROMIUM_PATH=/usr/bin/chromium。各JSON保留完整PATH、父HEAD与测试源哈希。过滤专项不能代表完整入口。

| 日志名 | 命令及额外环境 | 退出码 | 用时秒 |
| --- | --- | ---: | ---: |
| [baseline](baseline.txt) | ` node scripts/check.cjs` | 0 | 431.05 |
| [pace-before](pace-before.txt) | ` node scripts/v325-pace-audit.cjs docs/validation/v325-v328/pace-before-data.json` | 0 | 0.52 |
| [profile-before](profile-before.txt) | ` node scripts/v328-profile.cjs` | 1 | 1.76 |
| [profile-before-fixed](profile-before-fixed.txt) | ` node scripts/v328-profile.cjs` | 0 | 1.44 |
| [profile-before-timers](profile-before-timers.txt) | ` node scripts/v328-profile.cjs` | 0 | 3.96 |
| [v325-rules](v325-rules.txt) | ` node tests/v3-quality.test.js` | 0 | 0.09 |
| [v325-browser](v325-browser.txt) | `V3_TEST_FILTER='v3.25' node tests/v3-browser.test.js` | 0 | 2.69 |
| [pace-after](pace-after.txt) | ` node scripts/v325-pace-audit.cjs docs/validation/v325-v328/pace-after-data.json` | 0 | 0.37 |
| [v325-full](v325-full.txt) | ` node scripts/check.cjs` | 1 | 147.45 |
| [v325-navigation-fix](v325-navigation-fix.txt) | `V3_TEST_FILTER='v3.24 carried' node tests/v3-browser.test.js` | 0 | 2.78 |
| [v325-fixed-full](v325-fixed-full.txt) | ` node scripts/check.cjs` | 0 | 440.59 |
| [profile-reference-final](profile-reference-final.txt) | `PROFILE_SITE_ROOT='/workspace/scratch/v325-v328/baseline-site' node scripts/v328-profile.cjs` | 0 | 8.82 |
| [v326-rules](v326-rules.txt) | ` node tests/v3-quality.test.js` | 1 | 0.11 |
| [v326-browser](v326-browser.txt) | `V3_TEST_FILTER='v3.26' node tests/v3-browser.test.js` | 1 | 33.51 |
| [v326-rules-fixed](v326-rules-fixed.txt) | ` node tests/v3-quality.test.js` | 0 | 0.39 |
| [v326-browser-fixed](v326-browser-fixed.txt) | `V3_TEST_FILTER='v3.26' node tests/v3-browser.test.js` | 0 | 16.67 |
| [v326-full](v326-full.txt) | ` node scripts/check.cjs` | 0 | 466.09 |
| [profile-reference-soak](profile-reference-soak.txt) | `PROFILE_SITE_ROOT='/workspace/scratch/v325-v328/baseline-site' node scripts/v328-profile.cjs` | 0 | 57.93 |
| [pace-reference-detailed](pace-reference-detailed.txt) | `V3_AUDIT_ENGINE='/workspace/scratch/v325-v328/baseline-site/v3/engine.js' node scripts/v325-pace-audit.cjs docs/validation/v325-v328/pace-reference-detailed-data.json` | 0 | 0.92 |
| [v327-conditions](v327-conditions.txt) | ` node tests/v3-conditions.test.js` | 0 | 1.38 |
| [v327-browser](v327-browser.txt) | `V3_TEST_FILTER='v3.27' V3_SCREENSHOT_DIR='/workspace/scratch/v325-v328/screens' node tests/v3-browser.test.js` | 0 | 34.69 |
| [v327-v3-balance](v327-v3-balance.txt) | ` node tests/v3-balance.test.js` | 0 | 0.99 |
| [v327-v3-compatibility](v327-v3-compatibility.txt) | ` node tests/v3-compatibility.test.js` | 0 | 0.89 |
| [v327-v3-quality](v327-v3-quality.txt) | ` node tests/v3-quality.test.js` | 0 | 1.58 |
| [v327-v3-strategy](v327-v3-strategy.txt) | ` node tests/v3-strategy.test.js` | 0 | 1.78 |
| [v327-v3-expansion](v327-v3-expansion.txt) | ` node tests/v3-expansion.test.js` | 0 | 5.27 |
| [v327-v3-continuation](v327-v3-continuation.txt) | ` node tests/v3-continuation.test.js` | 0 | 4.94 |
| [v327-full](v327-full.txt) | ` node scripts/check.cjs` | 1 | 175.54 |
| [strategy-comparison](strategy-comparison.txt) | `V3_AUDIT_PREVIOUS_ENGINE='/workspace/scratch/v325-v328/baseline-site/v3/engine.js' node scripts/v327-strategy-audit.cjs docs/validation/v325-v328/strategy-comparison-data.json` | 0 | 0.16 |
| [v327-focus-fix](v327-focus-fix.txt) | `V3_TEST_FILTER='v3.19' node tests/v3-browser.test.js` | 0 | 42.18 |
| [v327-verified-full](v327-verified-full.txt) | ` node scripts/check.cjs` | 0 | 497.62 |
| [v328-rules](v328-rules.txt) | ` node tests/v3-quality.test.js` | 0 | 0.31 |
| [v328-compatibility](v328-compatibility.txt) | ` node tests/v3-compatibility.test.js` | 0 | 0.12 |
| [v328-browser](v328-browser.txt) | `V3_TEST_FILTER='v3.28' V3_SCREENSHOT_DIR='/workspace/scratch/v325-v328/screens' node tests/v3-browser.test.js` | 1 | 1.45 |
| [v328-browser-cooldown-fix](v328-browser-cooldown-fix.txt) | `V3_TEST_FILTER='v3.28' V3_SCREENSHOT_DIR='/workspace/scratch/v325-v328/screens' node tests/v3-browser.test.js` | 0 | 3.81 |
| [profile-after](profile-after.txt) | `PROFILE_SOAK_SECONDS='1800' node scripts/v328-profile.cjs` | 0 | 42.61 |
| [v328-full](v328-full.txt) | ` node scripts/check.cjs` | 1 | 250.32 |
| [profile-after-cpu](profile-after-cpu.txt) | ` node scripts/v328-profile.cjs` | 0 | 8.69 |
| [profile-reference-cpu](profile-reference-cpu.txt) | `PROFILE_SITE_ROOT='/workspace/scratch/v325-v328/baseline-site' node scripts/v328-profile.cjs` | 0 | 9.84 |
| [v328-svg-fix](v328-svg-fix.txt) | `V3_TEST_FILTER='v3.15' node tests/v3-browser.test.js` | 0 | 3.39 |
| [v328-touch-svg-fixed](v328-touch-svg-fixed.txt) | `V3_TEST_FILTER='v3.28' V3_SCREENSHOT_DIR='/workspace/scratch/v325-v328/screens' node tests/v3-browser.test.js` | 0 | 4.6 |
| [v328-verified-full](v328-verified-full.txt) | ` node scripts/check.cjs` | 0 | 491.66 |
| [profile-after-verified](profile-after-verified.txt) | `PROFILE_SOAK_SECONDS='1800' node scripts/v328-profile.cjs` | 0 | 62.86 |
| [profile-reference-verified](profile-reference-verified.txt) | `PROFILE_SITE_ROOT='/workspace/scratch/v325-v328/baseline-site' PROFILE_SOAK_SECONDS='1800' node scripts/v328-profile.cjs` | 0 | 70.46 |

未准备入口node scripts/check.cjs退出1，无测试运行；WebKit install退出1（官方域名403）。两者原文独立保存。v327-fixed-full只留下9语法原文后会话丢失，未取得退出码，不计通过，见interruption.json。profile-before-fixed虽退出0但未装对计时器，空采样无效，后续实际计数强制>0；不把它当性能通过。

原main参考站：`git archive 9e14610a197580d2b377dc8e2f1f8684f2c57e63 v3`解包至独立目录；两个参考引擎环境参数与源码SHA256在reference-source-hashes.json核对。性能脚本安装计时器早于页面加载，无任意等待掩盖竞态；30分钟为虚拟负载。

完整入口每个CHECK_RESULT的子命令与实际退出码均在对应full.txt，四版最终完整均无过滤。
