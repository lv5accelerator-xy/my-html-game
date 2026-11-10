# 实际测试调用

以下为实际run.py记录。专项过滤显式列出；完整入口未过滤。-15为为修复已确认缺陷而中止的子进程（外层241），不计通过或最终跳过；远端CI原始失败另见actions-42812952113-test-failure.txt。

| 调用 | 实际命令 | 测试环境 | 退出码 | 秒 |
| --- | --- | --- | ---: | ---: |
| [v321-rules](v321-rules.txt) | `node tests/v3-continuation.test.js` | `{}` | 1 | 0.05 |
| [v321-rules-fixed](v321-rules-fixed.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.2 |
| [v321-browser](v321-browser.txt) | `node tests/v3-browser.test.js` | `{}` | 1 | 32.94 |
| [v321-browser-fixed](v321-browser-fixed.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 10.92 |
| [v321-compatibility](v321-compatibility.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.19 |
| [v321-rules-final](v321-rules-final.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.32 |
| [v321-browser-final](v321-browser-final.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 10.3 |
| [v321-rules-complete](v321-rules-complete.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.21 |
| [v321-browser-complete](v321-browser-complete.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 8.98 |
| [v321-full](v321-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 387.75 |
| [v321-visual](v321-visual.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 10.08 |
| [v322-compatibility](v322-compatibility.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.08 |
| [v322-inherited-rules](v322-inherited-rules.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.21 |
| [v322-rules](v322-rules.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.77 |
| [v322-browser](v322-browser.txt) | `node tests/v3-browser.test.js` | `{}` | 1 | 32.63 |
| [v322-rules-hardened](v322-rules-hardened.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.75 |
| [v322-browser-fixed](v322-browser-fixed.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 10.41 |
| [v322-rules-final](v322-rules-final.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 0.77 |
| [v322-compatibility-final](v322-compatibility-final.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.07 |
| [v322-full](v322-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 397.27 |
| [v322-home-fix](v322-home-fix.txt) | `node tests/v3-browser.test.js` | `{}` | 0 | 10.43 |
| [v322-final-full](v322-final-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 396.25 |
| [v323-rules](v323-rules.txt) | `node tests/v3-continuation.test.js` | `{}` | 1 | 1.2 |
| [v323-rules-fixed](v323-rules-fixed.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 2.33 |
| [v323-compatibility](v323-compatibility.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.09 |
| [v323-browser](v323-browser.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.23", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 1 | 31.97 |
| [v323-rules-final](v323-rules-final.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 2.32 |
| [v323-browser-fixed](v323-browser-fixed.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.23", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 0 | 19.78 |
| [v323-browser-final](v323-browser-final.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.23", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 1 | 2.31 |
| [v323-browser-letters](v323-browser-letters.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.23", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 0 | 22.7 |
| [v323-full](v323-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 425.1 |
| [v324-rules](v324-rules.txt) | `node tests/v3-continuation.test.js` | `{}` | 1 | 2.39 |
| [v324-compatibility](v324-compatibility.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.23 |
| [v324-strategy](v324-strategy.txt) | `node tests/v3-strategy.test.js` | `{}` | 0 | 0.49 |
| [v324-browser](v324-browser.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.24", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 1 | 3.67 |
| [v324-rules-fixed](v324-rules-fixed.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 2.32 |
| [v324-browser-fixed](v324-browser-fixed.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.24", "V3_SCREENSHOT_DIR": "/workspace/scratch/v324-audit/screenshots"}` | 0 | 10.45 |
| [v324-compatibility-paid](v324-compatibility-paid.txt) | `node tests/v3-compatibility.test.js` | `{}` | 0 | 0.15 |
| [v324-acceptance-harness-local](v324-acceptance-harness-local.txt) | `node scripts/verify-public-v324.cjs` | `{}` | 0 | 44.23 |
| [v324-rules-final](v324-rules-final.txt) | `node tests/v3-continuation.test.js` | `{}` | 1 | 2.45 |
| [v324-rules-hardened](v324-rules-hardened.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 2.44 |
| [v324-full](v324-full.txt) | `node scripts/check.cjs` | `{}` | 1 | 112.31 |
| [v324-inherited-browser-fix](v324-inherited-browser-fix.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.20"}` | 0 | 16.88 |
| [v324-acceptance-harness-final](v324-acceptance-harness-final.txt) | `node scripts/verify-public-v324.cjs` | `{}` | 0 | 53.39 |
| [v324-final-full](v324-final-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 443.92 |
| [v324-jump-goal-before](v324-jump-goal-before.txt) | `node tests/v3-continuation.test.js` | `{}` | 1 | 2.41 |
| [v324-jump-goal-fixed](v324-jump-goal-fixed.txt) | `node tests/v3-continuation.test.js` | `{}` | 0 | 2.55 |
| [v324-jump-browser-fixed](v324-jump-browser-fixed.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.24 carried resident work"}` | 0 | 3.19 |
| [v324-release-fix-full](v324-release-fix-full.txt) | `node scripts/check.cjs` | `{}` | -15 | 195.49 |
| [v324-import-sync-browser](v324-import-sync-browser.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.24"}` | 0 | 12.08 |
| [v324-guarded-full](v324-guarded-full.txt) | `node scripts/check.cjs` | `{}` | -15 | 178.82 |
| [v324-navigation-browser](v324-navigation-browser.txt) | `node tests/v3-browser.test.js` | `{"V3_TEST_FILTER": "v3.24"}` | 0 | 11.33 |
| [v324-release-final-full](v324-release-final-full.txt) | `node scripts/check.cjs` | `{}` | 0 | 441.51 |
