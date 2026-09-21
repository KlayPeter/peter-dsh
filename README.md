# Peter DSH · 给 Agent 用的实用插件

让 DeepSeek Harness（dsh）帮你把文档交付好、把项目的 AI 开发规则配好。一个仓库包含多个插件，按需安装，也可以全部安装。

## 我可以用它做什么？

| 你的需求 | 安装哪个插件 | 最后得到什么 |
| --- | --- | --- |
| 把笔记或资料整理成 PRD、说明文档、技术设计、博客或调研报告 | [内容交付 Content Delivery](packages/content-delivery/README.md) | Agent 优化后的内容、必要的图示，以及 HTML / PDF / 可编辑 Word |
| 新项目快速起步，或让 Agent 理解已有项目的开发规则 | [项目 AI 配置 Project AI Init](packages/project-ai-init/README.md) | AGENTS.md、项目事实和工作偏好；空项目还可生成最小工程骨架 |
| 检查需求是否实现、交付证据是否齐全 | 交付验收助手 | 尚在规划，暂不可安装 |

内容交付当前为 v0.1.0，项目 AI 配置为 v0.2.0，尚未发布到 npm。下面通过下载源码、打包、安装到 dsh 来使用。

## 安装到 DeepSeek Harness

以下命令适用于 macOS / Linux 终端。先确保你已经安装并能正常使用 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，且配置好了模型。插件复用 dsh 当前的 Agent，不需要额外模型 API Key。

### 1. 检查环境，下载仓库

需要 Git、Node.js 22+（附带 npm）和 pnpm：

```sh
node --version
npm --version
dsh --version
pnpm --version
```

如果只有 pnpm 缺失，执行 `npm install -g pnpm`。如果 dsh 缺失，请先按其官方 README 安装并完成模型配置。

```sh
git clone https://github.com/KlayPeter/peter-dsh.git
cd peter-dsh
npm ci
```

已经下载过仓库的用户，进入现有 `peter-dsh` 文件夹即可，不用再次 clone。

### 2. 选择插件，打包并安装

下面以 **web** 为例：如果你平时用 `dsh web`，直接复制；如果用 `dsh --profile tui`，将命令中的 `web` 改成 `tui`。profile 是你启动 dsh 时选择的运行配置，插件只安装到指定配置中。

**项目 AI 配置插件**

在刚才的 `peter-dsh` 目录执行：

```sh
npm pack --workspace @klaypeter/project-ai-init
dsh plugin --profile web add "$PWD/klaypeter-project-ai-init-0.2.0.tgz"
```

**内容交付插件**

同样在 `peter-dsh` 目录执行：

```sh
npm pack --workspace @klaypeter/content-delivery
dsh plugin --profile web add "$PWD/klaypeter-content-delivery-0.1.0.tgz"
npm run deliver -- setup-browser
```

`setup-browser` 下载 PDF 和 Mermaid 图渲染所需的 Chromium，需要联网，并应由运行 dsh 的同一系统账户执行。Linux 缺少浏览器依赖时，见[浏览器准备说明](packages/content-delivery/README.md#安装与第一次导出)。

只需运行你要用的插件那一组命令；两组都运行就会安装两个插件。`.tgz` 是生成的安装包，`$PWD` 会自动取当前目录的绝对路径。仓库根目录包含多个包，不能把整个仓库当成一个 dsh 插件安装。

### 3. 进入目标项目，重启 dsh

关闭之前运行的 dsh。将下方 `/path/to/your-project` 换成你实际要处理的项目文件夹，再启动：

```sh
cd /path/to/your-project
dsh --profile web
```

**这里要进入你的目标项目，而不是插件仓库。** 默认情况下，插件读取和写入的根目录就是 dsh 启动时所在的目录。在网页中切换对话不会自动切换插件根目录；切换项目请从新目录重启，或按插件手册显式设置 `workspaceRoot`。

### 4. 在 dsh 中说出你的需求

安装了项目 AI 配置插件，可以直接说：

> 使用 project-ai-init，先检查当前目录。如果已经有项目，按现有技术栈补齐 AI 配置，保留已有规则；使用 minimal 预设，目标为 dsh。完成后检查配置。

如果是空目录：

> 使用 project-ai-init，我想做一个 Python 命令行工具来整理文件。先搭建最小工程并配置 AI 开发规则，然后继续实现整理功能和测试。

`minimal` 是简洁通用规则；`peter` 是作者常用的 FEATURE.md、Mermaid、聚焦改动和验证习惯，也是默认预设。你可以明确选择任意一个，或按[插件手册](packages/project-ai-init/README.md)自定义。空项目内置骨架支持 Node CLI、Python CLI、静态网页和文档仓库；其他技术栈由 Agent 搭建后再配置。

安装了内容交付插件，先把 `notes.md` 放进目标项目，再说：

> 使用 content-delivery，把 notes.md 整理成面向新同事的技术说明。保留事实和限制，必要时加流程图，另存 final.md，检查后导出 HTML、PDF 和 Word 到 delivery-v1。

完成后在目标项目的 `delivery-v1` 目录查看 `document.html`、`document.pdf` 和 `document.docx`。再次交付请换一个新目录，例如 `delivery-v2`。

### 5. 确认安装成功

在终端查看对应 profile 的安装记录：

```sh
dsh plugin --profile web list --depth 0
```

应能看到你安装的 `@klaypeter/project-ai-init` 或 `@klaypeter/content-delivery`。这一步确认包已安装；再到重启后的 dsh 对话验证工具确实能调用：

- 项目 AI 配置：说“调用 ai_project_inspect，只检查当前项目，不修改文件”。应返回目录、已有文件与技术栈线索。
- 内容交付：说“调用 delivery_guide，获取技术说明文档的表达优化指南”。应返回写作指南。

如果提示没有工具，先确认安装与启动使用同一个 profile、已经重启，并查看 dsh 启动日志有无插件加载错误。仅让模型口头回答“已安装”不算验证。

## 项目 AI 配置：选择自己的习惯，持续更新

首次使用时可选择 Peter 预设、minimal 简洁预设、已有个人模板，或指定一个参考仓库。直接对 Agent 说：

> 从我指定的仓库提取开发习惯，保存为 my-style 模板。按当前项目的实际技术栈调整配置，并帮我安装和连接规则里需要的 MCP。

以后可以说：

> 更新我的偏好：功能文档用中文。这个项目另外使用现有测试命令，不改其他项目。把更新后的个人模板导出给我复用。

个人模板与当前项目调整分开保存。模板更新后，可在其他项目显式同步；不会悄悄改动所有仓库。CodeGraph 有内置安装器；其他工具由 Agent 按官方说明安装并验证，需要登录、凭据或重启时明确提示。详见[偏好与工具使用说明](packages/project-ai-init/README.md#选择自己的偏好并持续迭代)。

已安装旧版本的用户，在仓库 `git pull`、`npm ci` 后重新执行上面的项目 AI 配置插件打包与安装命令，然后重启对应 dsh profile。旧项目的 `.ai-init/config.json` 会保留原来的偏好；要采用新 Peter 规则，明确要求“切换到当前 peter 预设并同步”。

## 不用 dsh，也能用吗？

可以。两个插件都提供独立 CLI 和可安装的 Skill。支持读取 Skill、执行本地命令的 Agent 可以使用；安装 Skill 和安装 CLI 是两个步骤：

- [内容交付：其他 Agent 安装与示例](packages/content-delivery/README.md#给其他-agent-使用)
- [项目 AI 配置：其他 Agent 安装](packages/project-ai-init/README.md#其他-agent)

只想试一下 Markdown 导出，也可以在本仓库直接运行：

```sh
npm run deliver -- setup-browser
npm run deliver -- export --input packages/content-delivery/examples/design.md \
  --type design --formats html,pdf,docx --out output/design-v1
```

结果在 `output/design-v1`。这条命令转换已有 Markdown；内容创作和表达优化由你正在使用的 Agent 完成。

## 仓库组织

```text
packages/
  content-delivery/       # 可独立打包：引擎、CLI、Harness 适配、Skill、示例
    src/
    skills/content-delivery/
      SKILL.md           # 短入口：模式与类型路由
      references/        # 共用表达、五类文档、图示、导出
    vendor/              # 7 个上游 Skill 原文、许可证、版本与哈希
    tests/
    examples/
  project-ai-init/       # 项目扫描、偏好、空项目骨架、更新与检查
docs/                    # 维护文档
scripts/                 # 仓库维护脚本
```

每个插件持有自己的运行依赖、Skill 和 README。现阶段的共用规则放在内容交付包内部；两个插件目前独立发布；通用代码达到实际复用需求时再提取共享包，避免让独立安装依赖仓库外文件。

## 开发与来源

```sh
npm test
npm run test:integration  # 需要 Chromium；Linux 还需浏览器系统依赖和中文字体
npm pack --workspace @klaypeter/content-delivery
```

- [第三方 Skill 与许可](packages/content-delivery/THIRD_PARTY.md)

Harness 包装方式参考 [Discussion #961](https://github.com/deepseek-ai/deepseek-harness/discussions/961) 和 [dsh-report-studio](https://github.com/ciceroyang/dsh-report-studio)，并按本机 Harness API 验证。没有复制其业务实现。

原创代码采用 [MIT](LICENSE)；`vendor/` 内材料保留各自许可证。
