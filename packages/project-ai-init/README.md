# Project AI Init · 让 Agent 延续你的开发习惯

换一个项目，不必从头交代一遍“怎么开发”。选一套预设，或从你喜欢的仓库提取工作习惯，再结合当前项目生成 Agent 能读取的开发规则。

偏好可以随使用不断调整：通用习惯留在个人模板里，当前项目的特殊约定单独保存。下一个项目继续复用，不把上一个项目的技术栈和业务目录一起带过去。

## 什么时候用它？

- **开始一个新项目**：告诉 Agent 要做什么，明确技术栈后搭建支持的最小骨架，配好开发规则。
- **让 Agent 接手已有项目**：先读现有内容，整理实际技术栈、命令和文档入口，保留代码及手写约定。
- **把顺手的做法留下来**：从参考仓库提取习惯，形成可导出、可分享的个人模板。
- **用着用着想改规则**：告诉 Agent 哪些习惯以后通用、哪些只在这个项目生效，再同步配置。

## 一次使用，会得到什么？

例如，你对 Agent 说：

> 参考 /path/to/my-old-project，提取我的开发习惯。按当前项目的实际情况配置，保留已有规则，并帮我准备需要的 MCP 工具。

Agent 会读取参考资料和目标项目，提炼偏好、生成变更计划，然后在你的任务范围内应用。结果包括：

| 你关心的结果 | 保存在哪里 |
| --- | --- |
| Agent 从哪里开始了解这个项目 | AGENTS.md；选择 Claude 时补充 CLAUDE.md |
| 项目有哪些技术栈、脚本和文档入口 | `.agent-context/project.md` |
| 按什么习惯开发，这个项目有哪些例外 | `.agent-context/workflow.md` |
| 以后如何更新偏好、导出模板 | `.ai-init/config.json` |
| 规则要求的工具是否能用 | 安装流程与实际调用验证；需要重启或凭据时明确提示 |

空项目还可以生成 Node CLI、Python CLI、静态网页或文档骨架。骨架是开发起点，具体业务由 Agent 继续实现；其他技术栈由 Agent 使用合适的脚手架搭建后再配置。

当前版本 **v0.2.0**，支持 DeepSeek Harness、独立 CLI 和通用 Skill。当前 Agent 理解需求，程序负责扫描、生成与更新；插件不单独调用模型 API。

[安装到 dsh](#第一次使用安装到-deepseek-harness) · [选择和更新偏好](#选择自己的偏好并持续迭代) · [准备 MCP 工具](#自动准备规则里需要的工具) · [升级旧版本](#从旧版本升级)

## 第一次使用：安装到 DeepSeek Harness

已能正常使用 dsh 的用户，按以下顺序操作。需要 Git、Node.js 22+ 和 pnpm；没有 pnpm 时先执行 `npm install -g pnpm`。以下是 macOS / Linux 终端命令。

安装源码放在固定工具目录，不需要放进待处理的业务项目。已有仓库可直接复用并跳过下载；插件已安装时，直接从目标项目启动 dsh，无需重复 clone。以下首次下载命令要求 `~/.local/share/peter-dsh/source` 尚不存在。

```sh
# 下载仓库；已下载的用户直接进入现有 peter-dsh 目录
mkdir -p "$HOME/.local/share/peter-dsh"
git clone https://github.com/KlayPeter/peter-dsh.git "$HOME/.local/share/peter-dsh/source"
cd "$HOME/.local/share/peter-dsh/source"
npm ci
# 打包这个插件，安装到 web profile
mkdir -p "$HOME/.local/share/peter-dsh/packages"
npm pack --workspace @klaypeter/project-ai-init --pack-destination "$HOME/.local/share/peter-dsh/packages"
dsh plugin --profile web add "$HOME/.local/share/peter-dsh/packages/klaypeter-project-ai-init-0.2.0.tgz"
```

如果平时用的是 `tui` 或其他 profile，把 `web` 换成对应名称。关闭旧 dsh，将下面路径换成**要配置的目标项目**，重新启动：

```sh
cd /path/to/your-project
dsh --profile web
```

然后在 dsh 对话里说：

> 使用 project-ai-init，检查当前项目，根据已有内容配置 AI 开发规则，保留原有 AGENTS.md 和代码，使用 minimal 预设，目标为 dsh，完成后检查结果。

预期得到 AGENTS.md 的配置入口、`.agent-context/` 中的项目事实与工作规则，以及 `.ai-init/` 中的更新配置。`minimal` 适合先试用；想采用作者的功能文档和开发习惯，可改用 `peter`。

验证工具是否加载：说“调用 ai_project_inspect，只检查，不修改”。如果没有该工具，确认安装和启动使用同一个 profile，并已重启。更完整的环境检查见[仓库安装指南](https://github.com/KlayPeter/peter-dsh#安装到-deepseek-harness)。无需额外安装上游 Skill 或配置模型 API。

## 不同项目会怎样处理？

| 场景 | 行为 |
| --- | --- |
| 空目录，有明确目标与技术栈 | 选择内置骨架，生成入口、必要测试、README 和 Agent 配置 |
| 空目录，只有模糊目标 | 返回 needs-input，不自动选框架或写文件；由 Agent 澄清或明确选择 |
| 已有代码、README 或其他内容 | 分析已有文件、manifest、锁文件和指令；不创建业务骨架、不更换技术栈 |
| 已初始化项目 | sync 更新项目事实与偏好，保留手写内容；doctor 检查状态 |

只有 Git 元数据、许可证、忽略文件或 Agent 指令的目录仍可视为空项目。请先创建目标目录；CLI 不自动创建任意项目根路径。

内置骨架为 `node-cli`、`python-cli`、`static-web`、`docs`，另有仅配置的 `none`。它们都是起点，不实现任意业务。React、Flutter、Go 等需求由当前 Agent 使用合适的脚手架搭建后，再走已有项目配置。

## 直接用命令行配置

需要 Node.js 22+。仓库根目录：

```sh
npm ci
# 先看目标项目的实际情况
npm run ai-init -- inspect --root /path/to/project
# 预览配置变化
npm run ai-init -- init --root /path/to/project \
  --request "根据现有项目配置 AI 开发规则" --targets dsh,codex --dry-run
# 应用；生成的规则默认使用 peter 预设
npm run ai-init -- init --root /path/to/project \
  --request "根据现有项目配置 AI 开发规则" --targets dsh,codex
```

空项目：

```sh
mkdir my-python-tool
npm run ai-init -- init --root ./my-python-tool \
  --request "做一个 Python 命令行工具，用于整理本地文件" \
  --starter python-cli --targets dsh,codex,claude
```

接着让当前 Agent 根据目标实现整理文件的真实逻辑、完善测试，再运行 `sync` 更新配置。生成器不会把“有 argparse 入口”说成“文件整理工具已实现”。

`auto` 只识别少量明确的描述，不是通用自然语言理解模型。含否定、替代方案或无法确定技术栈时，需要 Agent 明确选择 `--starter`。只配置规则可选 `--starter none`。已有内容时任何非 none 骨架都会被拒绝。

## 选择自己的偏好并持续迭代

首次使用，Agent 会让你选择：

| 选择 | 适合谁 |
| --- | --- |
| peter | 使用作者的功能文档、Mermaid、聚焦改动、验证及 CodeGraph 工作方式 |
| minimal | 只需要少量通用开发规则 |
| 个人模板 JSON | 已经积累了自己的习惯，希望在多个项目复用 |
| 参考仓库 | 从你喜欢的项目中提取习惯，再形成个人模板 |

可以直接说：

> 参考 /path/to/reference-repo，提取我的开发习惯，保存成 my-style 模板。按当前项目已有技术栈配置，并把需要的工具装好。

支持指定 Git 仓库地址，由当前 Agent 先检出到临时目录再读取；本地参考读取工具本身只接收目录路径。不会执行参考仓库的脚本或将其业务需求当成你的新任务。模板提炼由当前 Agent 完成，程序提供有来源的文本与项目线索。

配置分为两层：

- `preset`：跨项目复用的个人习惯，包含 `id`、`description`、`rules`、`featureDocs`、`tools`。
- `projectRules`：只属于当前项目的调整。例如沿用当前测试入口、特定目录的文档约定。不会跟着个人模板导出。

要修改偏好，直接说：

> 以后功能文档统一用中文；这个项目额外遵守现有数据库迁移流程。更新配置，并导出我的个人模板。

Agent 会合并变更、预览差异，再同步受管理的配置。原有手写内容仍然保留。导出的模板由你保存、分享；其他项目需要显式应用新模板，不会在后台一起被修改。

CLI 用户（以下命令在仓库根执行）：

```sh
# 读取参考资料，由当前 Agent 据此生成 my-style.json
npm run ai-init -- reference --root /path/to/reference-repo
# 使用个人模板配置目标项目
npm run ai-init -- init --root /path/to/project \
  --request "按当前项目配置" --preset-file ./my-style.json
# 模板文件更新后同步到这个项目
npm run ai-init -- sync --root /path/to/project --preset-file ./my-style.json
# 导出当前个人模板；选一个新文件名，shell 重定向会覆盖已有文件
node packages/project-ai-init/src/cli.js preferences-export \
  --root /path/to/project > my-style-v2.json
```

也可直接编辑目标项目 `.ai-init/config.json` 中的 `preset` 或 `projectRules`，再 sync。`--project-rules-file` 接收 JSON 字符串数组，用于仅更新当前项目约定。CLI 仍可使用 `--preset peter` / `--preset minimal` 显式选择；仅使用 CLI 且未指定时默认 peter。

## 自动准备规则里需要的工具

Agent 先检查现有 MCP 是否能调用，缺少时完成安装、项目初始化和当前 Agent 的连接配置。**软件已安装、索引已建立、MCP 已连接是三个不同状态**，需要逐步验证。

Peter 预设需要 CodeGraph，内置配方固定为 [@colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) 1.6.0。不会因为遇到另一个同名项目就混用安装命令。安装到目标项目 `.ai-init/runtime`，不修改所有 Agent 的全局配置。

```sh
npm run ai-init -- tools --root /path/to/project
npm run ai-init -- setup-codegraph --root /path/to/project --dry-run
npm run ai-init -- setup-codegraph --root /path/to/project
```

`setup-codegraph` 实际下载软件包、执行安装与版本检查、建立代码索引，并生成 `.ai-init/codegraph.dsh.json`。该覆盖层包含本机路径，应保持在 Git 忽略范围内。首次需要网络；目前安装器面向 macOS / Linux，Windows 可由宿主按上游官方步骤安装。

dsh 用户还需要 MCP 桥接包，并在下次启动时加载覆盖层。当前已验证 Harness 0.1.0-rc.6；`web` 换成实际 profile，其他 Harness 版本请匹配桥接包版本：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-mcp-client@0.1.0-rc.6
cd /path/to/project
dsh --profile web --patch .ai-init/codegraph.dsh.json
```

已有其他启动参数请保留。Agent 可以帮你完成安装与配置，但无法在当前会话中无缝重启自身服务；需要重启时会给出具体命令。重启后实际调用 `mcp__codegraph__codegraph_explore`，确认能查询当前项目再报告就绪。

其他 MCP、Codex 或 Claude 的连接配置由当前 Agent 按对应官方说明安装和合并，保留已有服务。依赖登录或 API Key 时提示缺失项，不把凭据写进模板。init/sync 本身只写项目配置；自动安装流程由 Skill 编排，CLI 用户需执行上述安装步骤。

安装失败会保留已下载依赖供排查，不影响偏好文件，也不会冒充安装成功。`doctor` 检查配置归属和漂移，不代替 MCP 连通性检查。

## 输出与更新

```text
AGENTS.md                         # 在受管理区域补充入口；保留原文
CLAUDE.md                         # 仅 claude 目标：追加 @AGENTS.md 兼容导入
.agent-context/
  project.md                      # 项目事实、命令来源与扫描提示
  workflow.md                     # 所选偏好
  feature-docs.md                 # peter 预设的功能文档约定
.ai-init/
  config.json                     # 用户可编辑的需求、目标 Agent、预设
  state.json                      # 生成区域与文件的基线哈希
.gitignore                        # 追加受管理的忽略规则
```

空项目还会按骨架生成源文件、测试、README 和 `docs/PROJECT_BRIEF.md`。这些业务骨架文件创建后归用户维护，sync 不重新生成或覆盖它们。

```sh
npm run ai-init -- sync --root /path/to/project --dry-run
npm run ai-init -- sync --root /path/to/project
npm run ai-init -- doctor --root /path/to/project
```

第一次搭建后运行 sync，会把新生成的代码、manifest 和文档纳入项目事实。之后文件和配置不变时重复 sync 不产生变化。

保留策略：

- AGENTS.md、CLAUDE.md 和 .gitignore 的标记外内容原样保留。
- `.agent-context` 的生成文件或标记内区域被手改时，返回 conflict，整次更新不执行。
- 需要保留手改时，先保存内容，将偏好迁入 config 的 preset 或标记外，再恢复上次生成部分后 sync。不要删除 state 来绕过检查。
- 已有同名普通文件不擅自接管；符号链接不写入。
- 计划后文件发生变化则要求重新计划。写入有项目锁；可捕获的失败会撤销本次已写内容。操作中若另一个程序又修改了同一文件，保留该修改并报告需要人工处理，不强行回滚它。
- 原子替换按文件进行，不是数据库事务。进程被强杀可能留下 lock 或部分状态；核对 Git diff 和文件后再恢复，不能承诺掉电级事务恢复。

状态返回：`ready` 可应用；`needs-input` 需要明确需求；`conflict` 有内容归属冲突；`applied` 已应用。CLI 的 needs-input/conflict 退出码为 2，其他错误为 1。doctor 的 refresh-available 表示可以 sync，不等于错误。

## DeepSeek Harness 配置与工具

安装步骤见本文开头。文件操作根目录默认是 dsh 启动目录；服务或多项目场景应配置 `workspaceRoot`，例如覆盖层：

```yaml
- id: peter-project-ai-init
  config:
    workspaceRoot: /absolute/path/to/project
```

通过 `dsh --profile web --patch /path/to/workspace.yml` 启动。该插件不会根据对话随意切换可写项目根目录。

注册七个工具：

| 工具 | 用途 |
| --- | --- |
| ai_project_inspect | 只读检查已有内容、技术栈和规则路径 |
| ai_project_plan | 根据用户描述生成文件预览和短期 planId |
| ai_project_apply | 应用该会话的计划；校验文件未改变 |
| ai_project_doctor | 检查归属、漂移及是否需要更新 |
| ai_preferences_reference | 读取指定参考仓库的偏好证据 |
| ai_preferences_export | 导出当前可复用个人模板 |
| ai_project_tooling | 检查工具需求、预览或安装 CodeGraph |

有 skills 服务时自动注册 `project-ai-init` Skill，无需再单独安装 5 个上游 Skill。planId 只在当前插件实例中有效，30 分钟过期、应用后失效；插件卸载后重新计划。

可以对 dsh 说：

> 使用 project-ai-init，先看这个目录的内容。我要做一个 Python 命令行工具来整理文件：如果目录为空，搭建最小骨架并用 peter 偏好配置；如果已有内容，按现有技术栈配置。然后继续实现文件整理功能并验证，不要只交付骨架。

或者：

> 使用 project-ai-init，根据现有项目补齐 AI 开发配置，保留我的 AGENTS.md 和既有规则，使用 peter 预设，目标是 dsh 和 Codex。不要执行部署或迁移脚本。

## 其他 Agent

独立 CLI：

```sh
npm pack --workspace @klaypeter/project-ai-init
npm install -g ./klaypeter-project-ai-init-0.2.0.tgz
peter-ai install-skill --target /path/to/project/.agents/skills
```

目标目录应是该 Agent 实际扫描的目录，安装会带上入口、引用资料和上游快照，已有 Skill 不覆盖。只安装 Skill 不会安装 CLI。也可以用 `peter-ai guide --mode empty` 或 `--mode existing` 直接取得指南。

dsh 与支持 AGENTS.md 的 Agent 共享根入口。Claude 目标使用其官方支持的 `@AGENTS.md` 导入；其他 Agent 不需要理解这个导入语法。`.agent-context/` 是普通资料目录，通过 AGENTS.md 显式引导读取，不声称宿主自动发现它。

## 当前边界与测试

- 检测 Node.js 多包项目的本地 manifest、锁文件和脚本，分别记录 runner。无明确包管理器时不猜测。
- Python、Rust、Go、Flutter 目前识别文件线索；复杂命令、架构和语义冲突仍由当前 Agent 阅读项目确认。
- 扫描跳过依赖、缓存、vendor 和环境变量文件；限制为 8 层目录、8,000 个条目，超过时要求选更小的根目录，不默默使用不完整扫描。
- init/sync 不执行项目脚本或 Git 操作；独立工具安装步骤会下载依赖并建立索引。其他 MCP 安装与宿主配置由当前 Agent 完成。
- doctor 检查归属和可推导的配置变化，不证明测试通过或宿主已加载全部指令。

运行 `npm test --workspace @klaypeter/project-ai-init` 验证空项目、已有多包项目、手写保护、重复更新、过期计划、冲突、回滚和来源哈希。实际运行了 Node 和 Python 骨架测试。

已对用户提供的参考项目只读扫描/预览，识别到后端 Bun、前端 pnpm；没有对该参考项目应用配置。Harness 0.1.0-rc.6 使用真实 Cordis 服务验证了工具注册、应用与同步、planId 失效和卸载清理。没有进行模型驱动的完整业务开发评测。

第三方资料许可见 [THIRD_PARTY.md](THIRD_PARTY.md)，设计见 [FEATURE.md](FEATURE.md)。原创实现 MIT，上游资料各自授权。

## 从旧版本升级

在插件仓库执行：

```sh
git pull
npm ci
mkdir -p "$HOME/.local/share/peter-dsh/packages"
npm pack --workspace @klaypeter/project-ai-init --pack-destination "$HOME/.local/share/peter-dsh/packages"
dsh plugin --profile web add "$HOME/.local/share/peter-dsh/packages/klaypeter-project-ai-init-0.2.0.tgz"
```

随后重启对应 profile。旧项目无需删除配置或重新创建；sync 会保留原来的个人偏好。需要新 Peter 预设时显式运行 `peter-ai sync --root /path/to/project --preset peter`，或让 Agent 切换预设。原生成区域被手改时仍会提示冲突，先保留改动再解决。

新版验证覆盖模板跨项目复用、项目规则隔离、导出、更新、工具安装失败与覆盖保护。可选联网测试 `scripts/test-project-ai-codegraph.mjs` 实际安装固定版本、建立索引，通过真实 dsh MCP 桥接调用只读查询；需要 `DSH_MODULE_ROOT` 指向现有 Harness 的 node_modules。
