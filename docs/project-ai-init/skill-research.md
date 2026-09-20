# 项目 AI 配置初始化：Skill 调研与首版建议

调研日期：2026-09-20。状态：本文记录设计阶段调研；现已实现 v0.1.0，实际能力和命令见 [插件 README](../../packages/project-ai-init/README.md)。本次使用 find-skills、Skills CLI、GitHub 源码与官方文档核对候选；没有安装候选 Skill、运行其初始化流程或修改个人 Agent 配置。

目标是把“我的工作偏好”与“这个项目的实际情况”组合起来，为不同 Agent 提供可维护的项目配置。以下建议是本项目的设计判断，不是上游 Skill 已经实现的统一能力。

## 最值得采用的五个 Skill

| Skill / 原始来源 | 解决的问题 | 建议采用 | 需要调整 |
| --- | --- | --- | --- |
| [create-agentsmd · GitHub](https://github.com/github/awesome-copilot/blob/4f4796f0bf30e105700f97ed8408c12b6aa95e06/skills/create-agentsmd/SKILL.md) | 从项目生成 AGENTS.md | 读取依赖清单、脚本、CI、目录与已有文档，提取真实命令 | 不照搬完整章节模板；没有的测试、部署命令不编造；示例 pnpm/Turbo 不是默认配置 |
| [agents-md · Sentry](https://github.com/getsentry/skills/blob/c2f99a5b04b4cd992ec3022d7c2c3e23e938d241/skills/agents-md/SKILL.md) | 创建和维护简洁指令 | 根文件精简、引用已有文档、子目录只写差异、核验路径 | 不强制其提交署名习惯；行数上限作为提醒而非硬限制；CLAUDE.md 兼容方式按客户端能力选择 |
| [agent-md-refactor · softaworks](https://github.com/softaworks/agent-toolkit/blob/3027f20f3181758385a1bb8c022d4041dfb4de84/skills/agent-md-refactor/SKILL.md) | 整理已有冗长配置 | 识别矛盾、重复和失效规则，根入口与专题资料分层 | 不机械拆成固定数量文件；不把所有通用规则都删掉；保留用户明确偏好 |
| [claude-automation-recommender · Anthropic](https://github.com/anthropics/claude-plugins-official/blob/c447c3207a425bc4e2a0d068435f64b0477ae981/plugins/claude-code-setup/skills/claude-automation-recommender/SKILL.md) | 根据项目推荐 Skill、MCP、Hooks 等 | 由技术栈和实际工作流给少量相关建议，并说明理由 | 它本身只做只读推荐；不把推荐等同安装，也不按每个类别凑数；Claude 专用配置不能原样用于 dsh |
| [claude-md-improver · Anthropic](https://github.com/anthropics/claude-plugins-official/blob/c447c3207a425bc4e2a0d068435f64b0477ae981/plugins/claude-md-management/skills/claude-md-improver/SKILL.md) | 检查和定向更新已有指令 | 找出旧命令、失效路径、缺失上下文，产生局部差异并保留原有内容 | 借鉴检查项，不把主观评分当作有效性保证；文件名和兼容细节以当前官方文档为准 |

组合方式：GitHub 提供“项目事实发现”的清单，Sentry 帮助压缩根指令，softaworks 负责已有配置整理，Anthropic 两个 Skill 分别补充“选择能力”和“持续维护”。它们存在重叠，应整理成自己的单一入口，按任务读取对应参考，不连续执行五套完整工作流。

## 两个补充候选与一个相关工具

### claude-settings-audit：只采用检测思路

[Sentry 原文](https://github.com/getsentry/skills/blob/c2f99a5b04b4cd992ec3022d7c2c3e23e938d241/skills/claude-settings-audit/SKILL.md)通过 manifest、锁文件和现有 settings 检测技术栈，再推荐权限与 MCP。

值得参考其检测项目和现有配置的方式；不直接应用权限模板。原文将部分宽泛前缀列入只读推荐，例如 `gh api:*`、`git branch:*`，但这些命令的不同参数可能产生写入行为。因此我们的初始化器不能把命令前缀存在直接解释为只读，也不能清空用户原有 deny 规则。

### codex-setup：参考初始化的生命周期

[sd0xdev 原文](https://github.com/sd0xdev/sd0x-harness/blob/04e8a5e3f5d9c482937c2ad2170fab5fbd02b630/skills/codex-setup/SKILL.md)提供 `init / doctor / sync`，并涉及生成文件、哈希和 Hook 状态。这个生命周期值得参考。

它服务于作者自己的 sd0x 工作流，依赖配套脚本，默认安装特定 commit-msg Hook。名称里的 Codex 不代表 OpenAI 官方。我们不采用其默认提交策略、不默认安装 Hook，也不能只复制 SKILL.md 就宣称完整可用。首版不将其整套引入。

### dotagents：可借鉴配置管理，不是 Skill

[Sentry dotagents](https://github.com/getsentry/dotagents/tree/561e826a47909291d46a125732e59d5ff8c7de40)用统一声明与锁定信息管理多个 Agent 的 Skill、MCP 等资源，提供安装、同步和检查。适合参考“一个配置源、多个客户端输出”和受管理文件归属记录。

其当前 README 默认操作全局范围，项目操作需要 `--project`；我们的插件应默认限定当前项目。其目标列表未列出 DeepSeek Harness，所以不能直接承诺 dsh 适配。先借鉴结构，不把它设为必装依赖。

## 使用规模与许可快照

安装量来自调研时 Skills CLI / skills.sh，Star 来自 GitHub API。它们随时间变化，且仓库 Star 不代表单个 Skill 的质量。

| Skill | 近似安装量 | 源仓库 Star | 所选内容的许可依据 |
| --- | ---: | ---: | --- |
| GitHub create-agentsmd | 12.9K | 39,181 | 仓库 MIT |
| Sentry agents-md | 5.6K | 1,000 | 仓库 Apache-2.0 |
| softaworks agent-md-refactor | 4.1K | 2,485 | Skill 声明与仓库 MIT |
| Anthropic claude-automation-recommender | 7.8K | 36,523 | 所属 claude-code-setup 插件 Apache-2.0 |
| Anthropic claude-md-improver | 11.1K | 同上 | 所属 claude-md-management 插件 Apache-2.0 |
| Sentry claude-settings-audit | 4.0K | 1,000 | 仓库 Apache-2.0 |
| sd0xdev codex-setup | 22 | 189 | 仓库 MIT |

安装量查看入口：[GitHub](https://skills.sh/github/awesome-copilot/create-agentsmd)、[Sentry](https://skills.sh/getsentry/skills/agents-md)、[softaworks](https://skills.sh/softaworks/agent-toolkit/agent-md-refactor)、[Anthropic 推荐](https://skills.sh/anthropics/claude-plugins-official/claude-automation-recommender)、[Anthropic 维护](https://skills.sh/anthropics/claude-plugins-official/claude-md-improver)、[Sentry 配置](https://skills.sh/getsentry/skills/claude-settings-audit)、[sd0xdev](https://skills.sh/sd0xdev/sd0x-harness/codex-setup)。

已读取上述来源的许可证，包括 Anthropic 两个插件各自的 LICENSE，而非仅依据仓库首页判断。后续下载进发布包时，继续保留原文、配套 references、相应许可证及 NOTICE（若有），固定提交并记录逐文件哈希；调研阶段只保留记录；实现阶段已将五个核心候选及配套资料纳入插件，见 [第三方声明](../../packages/project-ai-init/THIRD_PARTY.md)。

## 跨 Agent 不能只改文件名

[AGENTS.md](https://agents.md/)适合作为共享项目指令；[Agent Skills](https://agentskills.io/specification)提供可移植 Skill 格式。指令、Skill、权限配置是三个不同层次，不能混为一份 Markdown。

本机 dsh 0.1.0-rc.6 的 `dsh-agent-instructions` 文档与实现显示：默认加载 AGENTS.md / CLAUDE.md 及对应 local 文件，同级相同内容会去重。`dsh-skill-filesystem` 默认发现项目 `.dsh/skills` 与 `.agents/skills`；这取决于对应 provider 已加载及其配置，不代表任意自定义 profile 都启用。

[Claude Code 当前官方文档](https://code.claude.com/docs/en/memory#agentsmd)说明：直接读取 AGENTS.md 有版本、会话和现有 CLAUDE 文件等条件；需要兼容时可用 CLAUDE.md 的 `@AGENTS.md` 导入。Windows 上符号链接也有额外要求。因此不能照搬候选 Skill 中“一律建立软链接”的做法，更不能把所有 Agent 都当作理解 `@` 导入语法。

初始化器应按选定客户端生成适配，并检查文件是否可被发现。自然语言指令只是模型上下文；实际权限与运行限制仍由宿主控制。

## 适合 Peter 的首版方案

调研时建议包名 `project-ai-init`、CLI `peter-ai`；以下保留设计建议，实际实现范围以插件 README 为准。

### 分开维护三类输入

1. **项目事实**：语言、包管理器、真实脚本、目录、CI、已有 Agent 文件。保留事实来源；缺失信息标为未知，不能猜出测试命令。
2. **个人偏好**：沟通语言、工作流程、提交风格、常用 Skill 组合。做成用户可编辑的 preset；当前对话没有明确的偏好不自动归入“Peter 默认”。
3. **Agent 适配**：目标客户端的发现目录、指令加载方式、原生配置格式。共享规则只维护一份，适配输出按实际需要生成。

当个人偏好与项目既有规则矛盾，报告具体冲突，不能自动把个人偏好覆盖成团队规范。项目配置不写个人 API Key 或其他凭据。

### 首版三个操作

- `init`：发现项目 → 合并选定偏好 → 生成计划与文件差异 → 写入配置。
- `sync`：更新插件管理的部分，检测用户手动修改；有冲突则保留现场，不整文件覆盖。
- `doctor`：检查坏链接、占位符、缺失命令、Skill 路径、重复/过时配置与客户端兼容性。

预览能力可设计为 `--dry-run`；正常执行不必在已授权范围内反复询问。未知偏好或无法自动解决的矛盾才需要用户决策。安装网络资源、改权限、增加 Hooks 应是明确选择的能力，不夹带在基础初始化中。

### 可能生成的文件

```text
AGENTS.md                          # 简短入口：项目事实与适用规则
.agent-context/                    # 本插件的普通参考目录，不声称由 Agent 自动发现
  workflow.md                      # 有实际内容时才生成
  testing.md
.agents/skills/                    # 选定的、客户端可发现的项目 Skill
.ai-init/
  config.json                      # 目标 Agent、偏好 preset、选定资源
  state.json                       # 所管理文件/区域、版本与基线哈希
CLAUDE.md                          # 仅目标客户端需要时增加兼容入口
```

文件布局仍可调整。根 AGENTS.md 明确链接 `.agent-context/` 的适用资料；不是创建目录就假定 Agent 会读取。已有 AGENTS.md 保留人工内容，只维护明确区域；已有 CLAUDE.md 不替换，适配时检查重复和冲突。

### 与内容交付插件如何配合

用户选择“文档工作流”预设时，可以包含已有 content-delivery Skill；但项目初始化的职责是配置和发现，不把内容导出引擎直接复制进来。两包都保持可独立安装。

共用的是 Skill 来源记录、固定版本、文件管理和校验方法；写作规则、项目配置规则各自保留。等第二个插件的实际代码出现重复，再决定是否抽出共享包。

## 后续可验证的完成条件

- 在无配置、已有 AGENTS.md、已有多 Agent 配置三个项目样例上运行。
- 重复初始化没有重复内容，更新不丢手写修改，失败不留下半套配置。
- 文档中每个命令和引用都有来源，未执行的命令不标成测试通过。
- dsh 实际能发现生成的指令与选定 Skill；其他 Agent 的兼容范围分别记录。
- preset 能导出复用，但不会把本机绝对路径和凭据带到其他项目。

## 单独试用候选的命令

下列是手动试用方式，不是我们的插件安装步骤，本次未执行。安装后还需要阅读其流程和适用范围。

```sh
npx skills add github/awesome-copilot --skill create-agentsmd
npx skills add getsentry/skills --skill agents-md
npx skills add softaworks/agent-toolkit --skill agent-md-refactor
npx skills add anthropics/claude-plugins-official --skill claude-automation-recommender
npx skills add anthropics/claude-plugins-official --skill claude-md-improver
```
