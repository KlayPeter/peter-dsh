# Peter DSH · 把重复交代的事，交给插件

文档怎么写才容易读？换个项目，怎么让 Agent 继续按你的习惯开发？

Peter DSH 把这些重复工作做成可复用的插件：帮你整理内容、输出交付文件，也帮你配置项目、积累自己的开发习惯。支持 DeepSeek Harness（dsh），也提供其他 Agent 可用的 Skill 和命令行工具。

[安装到 dsh](#安装到-deepseek-harness) · [内容交付](packages/content-delivery/README.md) · [项目 AI 配置](packages/project-ai-init/README.md)

## 用它，把手头的事做完

### 零散材料，整理成能拿去评审、分享的文档

有了一堆笔记、需求和技术资料，却还要花时间梳理结构、补图、调格式？**内容交付**让 Agent 根据读者和用途组织内容，再把同一份定稿输出成 HTML、PDF 和可编辑 Word。

- **开评审**：把需求整理成 PRD，讲清范围、流程和验收条件。
- **讲明白**：把技术方案或知识点写成说明，配上必要的流程图、时序图和例子。
- **发出去**：把资料整理成博客或调研报告，用网页分享、用 PDF 阅读、用 Word 继续编辑。

> “把 notes.md 整理成给新同事看的技术说明，必要时加流程图，导出 HTML、PDF 和 Word。”

[开始使用内容交付 →](packages/content-delivery/README.md)

### 换一个项目，也能延续你的开发习惯

每次都要重新告诉 Agent：先看哪些文档、怎么验证、功能说明放哪里？**项目 AI 配置**把这些习惯保存成可更新的个人模板，再结合当前项目的实际内容生成开发规则。

- **从零开始**：明确目标后搭好支持的最小工程骨架，配上 Agent 工作规则。
- **接手旧项目**：识别已有技术栈、命令和约定，保留代码与手写规则。
- **越用越合手**：选现成预设，或从你喜欢的仓库提取习惯；以后修改偏好，再用于其他项目。需要的工具由安装流程和 Agent 继续配置、验证。

> “参考我以前的仓库，提取开发习惯。按当前项目调整配置，并把需要的 MCP 装好。”

[开始使用项目 AI 配置 →](packages/project-ai-init/README.md)

两个插件可单独安装。内容交付当前为 v0.1.0，项目 AI 配置为 v0.2.0；尚未发布到 npm，下面从仓库打包安装。

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

## 后续计划

交付验收助手：把需求、实现和验证证据对应起来，帮助检查交付是否完整。尚未实现，暂不可安装。

## 参与开发

两个插件分别位于 `packages/content-delivery` 和 `packages/project-ai-init`，各自包含实现、Skill、示例和使用说明。

```sh
npm test
npm run test:integration  # 内容交付的格式集成测试，需要 Chromium
```

原创代码采用 [MIT](LICENSE)。第三方资料保留各自许可证，见[内容交付](packages/content-delivery/THIRD_PARTY.md)与[项目 AI 配置](packages/project-ai-init/THIRD_PARTY.md)的许可说明。
