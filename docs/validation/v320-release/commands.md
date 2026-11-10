# v3.20 本次执行账本

所有时间为2026-11-10 UTC。测试脚本数、规则组、浏览器完整流程与规范旧档是不同口径；不将内部assert调用冒充独立玩法。GitHub步骤success对应进程退出0，原始日志链接/摘录与JSON另存本目录。

## 完整入口

云命令（真实Node22.23.4/PW1.55.0/Chromium151）：

```sh
PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH \
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright \
CODEX_CHROMIUM_PATH=/usr/bin/chromium node scripts/check.cjs
```

退出0；9语法、17脚本、137命名v3规则组、52规范旧档、94完整v3浏览器，失败/跳过0。26个实际子命令及逐项退出码在`preflight-full.txt`，没有设置过滤器。

GitHub Node22/PW1.55.0原PR CI42699912273（head d2fc83c）和正式Pages42739585599（main a7bfea8）各执行`node scripts/check.cjs`，再执行`V3_BROWSER_ENGINE=webkit node tests/v3-browser.test.js`：均退出0，同样9/17/137/52/94，额外WebKit94。已回读真实日志。完整来源是相应Actions运行，不将其当作云WebKit。

## 本地新验收脚本调试

本机HTTP服务从隔离worktree运行`python -m http.server 8763 --bind 127.0.0.1`，仅自有服务，验证结束已停止。以下各次实际使用：

```sh
PUBLIC_GAME_URL=http://127.0.0.1:8763/ \
PUBLIC_AUDIT_DIR=/workspace/scratch/v320-release-audit/对应目录 \
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright \
CODEX_CHROMIUM_PATH=/usr/bin/chromium \
/workspace/scratch/starport-tools/node_modules/node/bin/node scripts/verify-public-v320.cjs
```

| 次数/目录 | 退出码 | 已完成UI流程 | 实际情况 |
| --- | ---: | ---: | --- |
| 1 `local-public-helper` | 1 | 0 | 延迟公告遮住回收按钮 |
| 2 `local-helper-2` | 1 | 0 | 可见性瞬时检查仍漏掉延迟公告 |
| 3 `local-helper-3` | 1 | 0 | 尚未关闭的新手引导覆盖按钮 |
| 4 `local-helper-4` | 1 | 4 | 受控时钟没有navigation timing条目；不能伪造性能 |
| 5 `local-helper-5` | 0 | 7 | 实际14目标哈希、30唯一v3.16快照；仅本地 |
| 6 `local-helper-6` | 0 | 7 | 正确关闭实际三层弹窗；仅本地 |
| 7 `local-helper-7` | 0 | 7 | 刷新前后校验可见图片完整响应；仅本地 |

前三次按真实已出现弹层关闭，第四次起仅新档真实时钟测性能；公开首轮随后揭示WebKit弹层层级竞态，再明确按实际层级顺序处理。所有失败原文保留，没有强制点击、无意义固定等待、删除断言或跳过失败用例。

## 公开网址执行

Actions环境变量是`CODEX_PLAYWRIGHT_PATH=$GITHUB_WORKSPACE/node_modules/playwright`、`PUBLIC_GAME_URL=https://lv5accelerator-xy.github.io/my-html-game/`、`V3_TEST_URL=https://lv5accelerator-xy.github.io/my-html-game/v3/`，`V3_BROWSER_ENGINE`分别chromium/webkit，`RELEASE_SOURCE_SHA=a7bfea836a2285b22f1a1f1767defbdf832e62a2`。每引擎依次运行：

```sh
node scripts/verify-public-v320.cjs
node tests/v3-browser.test.js
```

| 运行 | Chromium | WebKit |
| --- | --- | --- |
| 42741301733 / head46c333c | 两命令退出0，7＋94流程 | 首命令退出1、0完成流程，第二命令因前置失败未执行 |
| 42743083976 / heada0a3638 | 两命令退出0，7＋94流程 | 首命令退出1、6完成流程，第二命令因前置失败未执行 |
| **42744103954 / headeb5287f** | **两命令退出0，7＋94流程** | **两命令退出0，7＋94流程** |

最终每引擎14份线上运行文件HTTP200/源码哈希、30唯一规范v3.16快照、101实际浏览器流程；最终测试失败/跳过0。前两轮失败/未执行不算通过，补强后完整重跑。正常音频导航取消单列：最终Chromium2、WebKit4；未忽略背景图片取消。源码18份哈希与最终公开被测提交对象相同，后续只有证据/文档/一次性工作流归档整理。

维护PR旧CI42741301593、42743083435按原并发规则被修正推送取消，不计通过。最终维护head的CI以PR #19检查页为准，与已发布main/公开验收来源分列；没有更改原CI超时或检查规则。

## 其他实际校验

- `node --check scripts/verify-public-v320.cjs`：每次补强后及最终整理均退出0。
- `node docs/validation/v320-release/strategy-audit.cjs`：退出0，三份赚取结局档、153份合法首段预览、63份港务条款比较；只读模型，不并入137规则组。
- `git diff --check`、修改文档本地链接校验、原工作流YAML解析、被测源码/提交对象哈希比对：均退出0；原运行文件与工作流diff为空。
- 云WebKit启动探针退出1：可执行文件缺失，浏览器流程0；历史官方下载403未被当作通过。
- 云`curl -I --max-time 20 https://lv5accelerator-xy.github.io/my-html-game/v3/`退出56/CONNECT403，未在本机完成公开访问；改由独立Actions直接执行公开浏览器。
- 通过GitHub工具获得的截图产物下载URL在本云正常curl返回退出22/HTTP403；没有人工查看线上截图。仅本地截图人工查看，公开截图与自动断言在Actions产物中。
- `git rev-parse @{u}`因仓库只配置main fetch refspec无法解析；显式远端ref/API head用于核对实际推送，不改共享fetch配置，不影响测试结论。

真实iPhone Safari、真实玩家存档/账号和Firebase生产写入均未执行。所有浏览器临时隔离context；只在测试响应中置空Firebase配置，生产配置没有修改。
