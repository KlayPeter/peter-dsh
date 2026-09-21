# Project AI Init · 让 Agent 接手项目，少走弯路

每换一个项目，都要解释一遍“在哪改、怎么启动、用什么跑测试、哪些约定不能破坏”？这个插件把项目里已有的答案整理成 Agent 下一次开发能直接使用的速查。

**先读项目，再补缺口。默认轻量，不把一堆模板塞进仓库。**

## 用完有什么不同？

| 原来容易发生的事 | 插件帮你留下的有效信息 |
| --- | --- |
| 前端 pnpm、后端 Bun，Agent 却在根目录跑 npm | 按子项目列出常用命令、执行目录和 manifest 来源，提示包管理器差异 |
| 每次都重新找功能入口、问“这个改动还影响哪里” | Agent 阅读代码和文档后，记录少量有来源的项目关系与改动提醒 |
| 写了“测试通过”，后来代码已经变了 | 命令默认只标为已发现；实际运行结果在当次交付中说明，不永久宣称通过 |
| 旧架构说明一直被当成正确答案 | 保存项目结论的来源摘要；来源变动后提醒重读，暂停沿用旧结论 |
| 为一个小项目生成多个空文档、安装不需要的工具 | 默认 compact + minimal：AGENTS.md 直接给出开发速查，不默认安装 MCP |
| 用着用着发现习惯需要调整 | 告诉 Agent “以后都这样”或“仅这个项目这样”，分别更新个人模板与项目规则 |

例如，一个前后端项目的速查会直接写：

```text
backend  → bun run typecheck   来源 backend/package.json#scripts.typecheck
frontend → pnpm run build     来源 frontend/package.json#scripts.build

两个子项目使用不同包管理器，不要在根目录统一安装。
没有声明 test 脚本，不能编造 npm test。
修改站会逻辑前，先沿现有功能索引找到 Owner 和验证方式。
```

最后一条这样的项目结论由当前 Agent 阅读后提炼，必须附实际来源。插件验证来源存在、检测来源变化；它不声称靠文件扫描就理解了业务。

## 安装到 DeepSeek Harness

需要已配置好的 dsh、Node.js 22+、Git 和 pnpm。当前 **v0.4.0**，尚未发布 npm；以下命令用于 macOS / Linux。已安装插件直接使用，无需每个工作区再 clone。

没有 pnpm 时先执行 `npm install -g pnpm`。优先复用已有插件源码；首次下载放在固定工具目录，下面的 `source` 目录需尚不存在：

```sh
mkdir -p "$HOME/.local/share/peter-dsh"
git clone https://github.com/KlayPeter/peter-dsh.git "$HOME/.local/share/peter-dsh/source"
cd "$HOME/.local/share/peter-dsh/source"
npm ci
mkdir -p "$HOME/.local/share/peter-dsh/packages"
npm pack --workspace @klaypeter/project-ai-init --pack-destination "$HOME/.local/share/peter-dsh/packages"
dsh plugin --profile web add "$HOME/.local/share/peter-dsh/packages/klaypeter-project-ai-init-0.4.0.tgz"
```

`web` 换成实际使用的 profile。关闭旧 dsh，再从**要配置的项目目录**启动：

```sh
cd /path/to/your-project
dsh --profile web
```

直接说：

> 使用 project-ai-init，让你下次接手这个项目能直接开始开发。先读现有规则、README、脚本和相关代码，只补有用的信息：在哪改、在哪运行哪些命令、要避开什么坑。用轻量配置，保留手写规则；需要保存项目结论时附实际来源，最后做一个合适的验证并说明缺口。

也可以把[仓库链接](https://github.com/KlayPeter/peter-dsh)交给能执行本地命令的 Agent，让它按说明安装；不要把插件源码放到业务工作区。

安装检查：`dsh plugin --profile web list --depth 0`。让 Agent 调用 `ai_project_inspect` 可进一步确认工具加载。

## 默认会改哪些文件？

已有项目默认只涉及四个文件：

| 文件 | 用途 |
| --- | --- |
| AGENTS.md | 在受管理区域写开发速查，原有手写内容保留 |
| .ai-init/config.json | 保存偏好、项目结论与来源版本，供以后更新 |
| .ai-init/state.json | 记录生成内容的基线，避免更新时覆盖手改 |
| .gitignore | 忽略锁和工具运行数据 |

选择 Claude 时增加 CLAUDE.md 的兼容入口。`expanded` 布局才拆出 `.agent-context/` 阅读材料。空项目明确需要骨架时，会增加相应代码、测试和文档；仅配置规则选 `starter=none`。

已有规则足够时，Agent 可以直接说明不需要新增。初始化不是越多文件越好。

## 选习惯、更新习惯

首次可选 minimal（默认）、Peter、自己的模板，或指定参考仓库。已选过就沿用，不每次重问。

- **minimal**：保留项目原有方式，补命令和必要规则，没有额外 MCP 依赖。
- **Peter**：采用作者的功能文档、Mermaid、聚焦改动及 CodeGraph 习惯，增加 project-check 项目自检 Skill。选了这套偏好，才按实际环境准备其工具。
- **自己的模板 / 参考仓库**：由 Agent 提炼可复用习惯，再适配当前项目。不会照搬旧项目的业务目录、技术栈或凭据。

可以说：

> 以后功能说明都用中文，但只有这个项目要求前后端接口一起检查。更新偏好，保留其他规则。

> 从我指定的仓库提取工作习惯；按当前项目调整，不复制它的业务结构。

个人模板只带走习惯；项目命令、业务结论和来源版本不随模板导出。

## 想用 Peter 的完整工作方式？

Peter 预设参考了作者真实项目里的功能索引、Owner FEATURE.md、内联 Mermaid、CodeGraph、聚焦改动和验证后提交习惯。另补充了三个常见问题的处理：保留用户与其他 Agent 的未提交改动、子目录工具链不外溢、接口变更沿调用方核对类型与兼容性。

直接对 Agent 说：

> 使用 project-ai-init，采用最新版 Peter 预设，目标是 Codex、Claude 和 dsh，使用 compact 布局。结合当前项目保留已有约定，生成 project-check，准备规则所需的工具并验证；不要照搬参考项目的技术栈。

| Agent | 项目规则 | 改动后检查入口 |
| --- | --- | --- |
| Codex | AGENTS.md | .agents/skills/project-check，可请求使用 $project-check |
| Claude Code | CLAUDE.md 引用 AGENTS.md | .claude/skills/project-check，可用 /project-check |
| dsh | AGENTS.md | 复用 .agents/skills/project-check，直接说“使用 project-check” |

project-check 带上当前项目的候选检查命令，沿实际 diff、接口和功能文档选择验证。它不会自动运行所有脚本，也不会自动提交。Codex/dsh 共用一份 Skill；只生成选中 Agent 的文件。minimal 仍不增加这些文件；自定义模板可设 `projectCheck: false`。

CLI 已安装时可显式选择：

```sh
peter-ai init --root /path/to/project --request "采用 Peter 工作方式" \
  --preset peter --targets codex,claude,dsh --layout compact
```

已有项目使用 `sync` 替代 `init`。`--preset peter` 会切换到新版内置 Peter；若当前模板有自己的修改，让 Agent 合并所需规则与 `projectCheck`，保留你的其他偏好。具体适配与来源见 [Agent 适配](skills/project-ai-init/references/adapters.md)。

## 旧项目怎么升级、精简？

先更新插件源码，执行上方的打包和安装命令，再重启同一 profile。**升级不会自动更换已有项目的偏好或布局。**

对 Agent 说：

> 使用 project-ai-init，把当前生成的配置精简为 compact 布局，保留我的偏好和手写内容。先阅读实际项目，补必要的项目提醒，再检查结果。

CLI 可预览再应用：

```sh
peter-ai sync --root /path/to/project --layout compact --dry-run
peter-ai sync --root /path/to/project --layout compact
peter-ai doctor --root /path/to/project
```

它只移除未手改的旧生成文件，不删除 `.agent-context` 中你自己的文件。检测到手改就返回 conflict；先保存内容、合并进偏好或手写区域，再处理差异。不要删 state 来绕过保护。想同时改用 minimal，需要显式指定 `--preset minimal`。

## 独立 CLI / 其他 Agent

在插件仓库目录安装：

```sh
npm pack --workspace @klaypeter/project-ai-init
npm install -g ./klaypeter-project-ai-init-0.4.0.tgz
peter-ai install-skill --target /path/to/project/.agents/skills
```

Skill 路径换成宿主实际读取的目录。已有 Skill 拒绝覆盖；更新前先保存自己的修改。只安装 Skill 不会安装 CLI。

常用命令：

```sh
peter-ai inspect --root /path/to/project
peter-ai init --root /path/to/project --request "按当前项目配置开发速查" --dry-run
peter-ai init --root /path/to/project --request "按当前项目配置开发速查"
peter-ai sync --root /path/to/project
peter-ai doctor --root /path/to/project
```

目标目录需要先存在。空项目可选 `node-cli`、`python-cli`、`static-web`、`docs` 或仅配置的 `none`；目标模糊时返回 needs-input，不擅自选框架。生成骨架不等于完成业务。

保存项目结论：`--facts-file ./facts.json`，JSON 为 `[{"text":"具体项目提醒","sources":["实际代码或文档路径"]}]`。每条最多 5 个来源，总计最多 12 条。来源变化后 doctor 返回 needs-review；重读后再提交更新的结论，sync 不会自动认可旧推理。

其他选项：`--preset peter|minimal`、`--preset-file ./my-style.json`、`--project-rules-file ./rules.json`、`--targets dsh,codex,claude`。`peter-ai preferences-export --root /path/to/project` 输出可复用模板；`reference --root /path/to/reference` 读取参考证据。

## MCP 与实际验证

新配置不会无条件安装工具；但项目已有规则或所选偏好明确要求工具时，Agent 应完成检查、安装、连接和实际调用，不只留下文字。

CodeGraph 内置配方固定为 `@colbymchenry/codegraph@1.6.0`：

```sh
peter-ai tools --root /path/to/project
peter-ai setup-codegraph --root /path/to/project --dry-run
peter-ai setup-codegraph --root /path/to/project
```

安装在目标项目 `.ai-init/runtime`，建立索引并生成连接覆盖层。dsh 0.1.0-rc.6 的接入示例：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-mcp-client@0.1.0-rc.6
cd /path/to/project
dsh --profile web --patch .ai-init/codegraph.dsh.json
```

其他 dsh 版本需匹配桥接包；Codex / Claude 等由当前宿主配置。保留已有参数与服务，重启后实际调用只读查询。缺凭据、待重启和调用失败要分别说明。详情见 [工具安装与连接](skills/project-ai-init/references/tooling.md)。

## 边界与工具

- 生成器不调用模型、不执行项目脚本。项目理解、语义冲突判断和合适的实际验证由当前 Agent 完成。
- 命令来源不代表命令安全或运行成功；doctor 检查配置和结论来源，不代替业务测试。
- CLI needs-input / conflict / doctor needs-review 退出 2；其他操作错误退出 1。source 变化仅说明需要复核，不代表原结论一定错。
- 手写区域保留；生成区域若手改，停止覆盖。计划后来源或目标变化需重新计划；写入有锁和可捕获失败回滚，不保证进程强杀后的事务恢复。
- 扫描限制 8 层、8,000 条目；源码摘录限 12 个文件，每份最多 60 行 / 4,000 字符，明确标注截断。不要把截断内容当成完整理解。

| dsh 工具 | 用途 |
| --- | --- |
| ai_project_inspect | 项目速查、脚本定义和有来源的阅读线索 |
| ai_project_plan / ai_project_apply | 预览与应用；支持 layout、projectFactsJson、presetJson、projectRulesJson |
| ai_project_doctor | 检查手改、需要同步的内容和过期项目结论 |
| ai_preferences_reference / ai_preferences_export | 读取参考证据、导出个人习惯 |
| ai_project_tooling | 检查工具、预览或安装 CodeGraph |

工具根目录默认为 dsh 启动目录。服务部署可用 `--patch /path/to/workspace.yml` 覆盖：

```yaml
- id: peter-project-ai-init
  config:
    workspaceRoot: /absolute/path/to/project
```

设计与验证见 [FEATURE.md](FEATURE.md)，第三方许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。原创代码 MIT。
