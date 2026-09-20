# Project AI Init · 项目 AI 配置初始化

结合用户要解决的问题、项目现有内容和可复用偏好，生成可维护的 Agent 配置。空项目可以搭建最小工程骨架；已有项目保留代码与技术栈，补充实际项目事实和工作规则。

v0.1.0 提供独立 CLI、通用 Skill 和 DeepSeek Harness 插件。不调用模型 API；当前 Agent 负责理解用户意图，程序负责扫描、规划和可靠写入。

## 第一次使用：安装到 DeepSeek Harness

已能正常使用 dsh 的用户，按以下顺序操作。需要 Git、Node.js 22+ 和 pnpm；没有 pnpm 时先执行 `npm install -g pnpm`。以下是 macOS / Linux 终端命令。

```sh
# 下载仓库；已下载的用户直接进入现有 peter-dsh 目录
git clone https://github.com/KlayPeter/peter-dsh.git
cd peter-dsh
npm ci
# 打包这个插件，安装到 web profile
npm pack --workspace @klaypeter/project-ai-init
dsh plugin --profile web add "$PWD/klaypeter-project-ai-init-0.1.0.tgz"
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

## 两种使用场景

| 场景 | 行为 |
| --- | --- |
| 空目录，有明确目标与技术栈 | 选择内置骨架，生成入口、必要测试、README 和 Agent 配置 |
| 空目录，只有模糊目标 | 返回 needs-input，不自动选框架或写文件；由 Agent 澄清或明确选择 |
| 已有代码、README 或其他内容 | 分析已有文件、manifest、锁文件和指令；不创建业务骨架、不更换技术栈 |
| 已初始化项目 | sync 更新项目事实与偏好，保留手写内容；doctor 检查状态 |

只有 Git 元数据、许可证、忽略文件或 Agent 指令的目录仍可视为空项目。请先创建目标目录；CLI 不自动创建任意项目根路径。

内置骨架为 `node-cli`、`python-cli`、`static-web`、`docs`，另有仅配置的 `none`。它们都是起点，不实现任意业务。React、Flutter、Go 等需求由当前 Agent 使用合适的脚手架搭建后，再走已有项目配置。

## 快速使用

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

## Peter 预设从哪里来

根据用户提供的参考项目规约提炼，见 [偏好提取记录](https://github.com/KlayPeter/peter-dsh/blob/main/docs/project-ai-init/preferences.md)。默认包括：

- 先理解目标与验收条件，改动聚焦、简洁优先。
- 功能 Owner 目录维护 FEATURE.md，功能索引集中管理。
- 功能变化同步文档，流程图使用内联 Mermaid。
- 当前需求内小步解耦，不做无关大重构。
- 验证与改动相称，不为形式要求制造测试。
- 用户授权的独立完成节点，先验证再提交。
- CodeGraph 可用时优先使用，不可用时可正常检索代码。

不强制 Bun、React、业务目录结构或安装 CodeGraph；这些属于具体项目事实。也不默认安装 Git Hooks、配置权限白名单、推送或发布。

其他人可以选择 `--preset minimal`，或自定义：

```sh
npm run ai-init -- init --root /path/to/project \
  --request "配置团队工作规则" \
  --preset-file packages/project-ai-init/examples/preferences.json
```

预设结构为 `id`、`description`、`rules`、`featureDocs`。初次生成后保存在目标项目 `.ai-init/config.json`，可以修改 `preset.rules` 再 sync，不必修改插件源码。

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

注册四个工具：

| 工具 | 用途 |
| --- | --- |
| ai_project_inspect | 只读检查已有内容、技术栈和规则路径 |
| ai_project_plan | 根据用户描述生成文件预览和短期 planId |
| ai_project_apply | 应用该会话的计划；校验文件未改变 |
| ai_project_doctor | 检查归属、漂移及是否需要更新 |

有 skills 服务时自动注册 `project-ai-init` Skill，无需再单独安装 5 个上游 Skill。planId 只在当前插件实例中有效，30 分钟过期、应用后失效；插件卸载后重新计划。

可以对 dsh 说：

> 使用 project-ai-init，先看这个目录的内容。我要做一个 Python 命令行工具来整理文件：如果目录为空，搭建最小骨架并用 peter 偏好配置；如果已有内容，按现有技术栈配置。然后继续实现文件整理功能并验证，不要只交付骨架。

或者：

> 使用 project-ai-init，根据现有项目补齐 AI 开发配置，保留我的 AGENTS.md 和既有规则，使用 peter 预设，目标是 dsh 和 Codex。不要执行部署或迁移脚本。

## 其他 Agent

独立 CLI：

```sh
npm pack --workspace @klaypeter/project-ai-init
npm install -g ./klaypeter-project-ai-init-0.1.0.tgz
peter-ai install-skill --target /path/to/project/.agents/skills
```

目标目录应是该 Agent 实际扫描的目录，安装会带上入口、引用资料和上游快照，已有 Skill 不覆盖。只安装 Skill 不会安装 CLI。也可以用 `peter-ai guide --mode empty` 或 `--mode existing` 直接取得指南。

dsh 与支持 AGENTS.md 的 Agent 共享根入口。Claude 目标使用其官方支持的 `@AGENTS.md` 导入；其他 Agent 不需要理解这个导入语法。`.agent-context/` 是普通资料目录，通过 AGENTS.md 显式引导读取，不声称宿主自动发现它。

## 当前边界与测试

- 检测 Node.js 多包项目的本地 manifest、锁文件和脚本，分别记录 runner。无明确包管理器时不猜测。
- Python、Rust、Go、Flutter 目前识别文件线索；复杂命令、架构和语义冲突仍由当前 Agent 阅读项目确认。
- 扫描跳过依赖、缓存、vendor 和环境变量文件；限制为 8 层目录、8,000 个条目，超过时要求选更小的根目录，不默默使用不完整扫描。
- 不联网安装依赖或 Skill，不读取真实业务配置，不修改全局 Agent 设置，不执行项目脚本或 Git 操作。
- doctor 检查归属和可推导的配置变化，不证明测试通过或宿主已加载全部指令。

运行 `npm test --workspace @klaypeter/project-ai-init` 验证空项目、已有多包项目、手写保护、重复更新、过期计划、冲突、回滚和来源哈希。实际运行了 Node 和 Python 骨架测试。

已对用户提供的参考项目只读扫描/预览，识别到后端 Bun、前端 pnpm；没有对该参考项目应用配置。Harness 0.1.0-rc.6 使用真实 Cordis 服务验证了四个工具、应用与同步、planId 失效和卸载清理。没有进行模型驱动的完整业务开发评测。

5 个上游 Skill 来源与许可见 [THIRD_PARTY.md](THIRD_PARTY.md)，设计见 [FEATURE.md](FEATURE.md)。原创实现 MIT，上游资料各自授权。
