# 本轮命令与结果

完整前缀：`PATH=/workspace/scratch/starport-release-tools/node_modules/node/bin:$PATH CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-release-tools/node_modules/playwright CODEX_CHROMIUM_PATH=/usr/bin/chromium`。没有过滤的完整入口与过滤专项分别记录。

| 命令 / 被测状态 | 退出码 | 证据 |
| --- | ---: | --- |
| `node scripts/check.cjs` / 原20121ba | 0 | cloud-full.log、result/counts.json；593.59秒 |
| `node tests/v3-conditions.test.js` / 新增回归、未修复 | 1 | null-leg-rules-before.log |
| `V3_TEST_FILTER='damaged null voyage leg' node tests/v3-browser.test.js` / 未修复 | 1 | null-leg-browser-before.log |
| `node tests/v3-conditions.test.js` / 首轮空值保护后 | 1 | null-leg-rules-after.log；发现归档回退幂等问题 |
| `node tests/v3-conditions.test.js` / 最终修复 | 0 | null-leg-rules-final.log；7组/2592报价 |
| `V3_TEST_FILTER='damaged null voyage leg' node tests/v3-browser.test.js` / 修复 | 0 | null-leg-browser-after.log；1完整流程 |
| `node tests/v3-compatibility.test.js` / 修复 | 0 | fix-compatibility.log；145档 |
| `V3_SCREENSHOT_DIR=/workspace/scratch/starport-release-evidence/screens node scripts/check.cjs` / 358de6d | 0 | fixed-full.log、result/counts.json；606.16秒，无过滤，30子命令全0 |
| `PROFILE_SOAK_SECONDS=1800 node scripts/v328-profile.cjs` | 0 | profile-current.log；固定虚拟负载 |
| `PUBLIC_GAME_URL=http://127.0.0.1:8765/ node scripts/verify-public-v324.cjs` | 0 | public-script-local.log；本地脚本预检，不是公网 |
| `playwright install webkit` / 官方下载 | 1 | cloud-webkit-install.log；403，未运行云WebKit |
| `curl -I --max-time 20 https://lv5accelerator-xy.github.io/my-html-game/v3/` | 56 | CONNECT403；改用既有GitHub独立公网验收 |

GitHub PR与Pages的完整入口、WebKit命令及实际CHECK_RESULT均保存在对应job原日志；公网运行命令为`node scripts/verify-public-v324.cjs`和`V3_TEST_URL=https://lv5accelerator-xy.github.io/my-html-game/v3/ node tests/v3-browser.test.js`，两引擎独立执行，以发布验收的最终状态和公网日志为准。

代码提交358de6d已实际push至PR21的原分支；Ready后按expected_head_sha=358de6d、merge_method=merge完成，实际merge/main=4d87e7f。未强推main、未绕过保护、未创建Release。文档经单独分支/PR保存，其实际提交和推送SHA见该PR。
