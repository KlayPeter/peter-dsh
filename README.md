# Peter DSH · 我的 Agent 插件分享

这里分享我在日常开发中制作和使用的 Agent 插件。先解决自己的实际需求，再整理成别人也能按需使用的工具。

一个仓库，多个独立插件。目前优先适配 **DeepSeek Harness（dsh）**，也提供其他 Agent 可用的 Skill 和命令行工具。我会根据自己的使用体验和大家的反馈持续迭代，也会陆续添加更多插件。

## 插件一览

| 插件 | 帮你做什么 | 当前版本 | 详细说明 |
| --- | --- | --- | --- |
| **内容交付** | 把零散资料整理成清晰易读的文档，配合图示表达，导出 HTML、PDF 和可编辑 Word。支持 PRD、技术说明、详细设计、博客和调研报告。 | v0.1.1 | [安装与使用](packages/content-delivery/README.md) |
| **项目 AI 配置** | 让 Agent 接手项目少走弯路：精简开发速查、按目录列出真实命令，保存有来源的项目提醒，并持续更新你的习惯。 | v0.3.0 | [安装与使用](packages/project-ai-init/README.md) |
| **交付验收助手** | Agent 说“完成了”之后，按原始需求逐项检查证据，列出已验证、失败、遗漏和待复核事项，告诉你还差什么。 | v0.1.0 | [安装与使用](packages/delivery-acceptance/README.md) |

每个插件都可以单独安装。具体能力、示例、配置方式和使用边界，请看对应插件的 README。

## 安装到 DeepSeek Harness

也可以直接把[本仓库链接](https://github.com/KlayPeter/peter-dsh)交给能执行本地命令的 Agent，让它按 README 帮你安装。例如：

> 请阅读 https://github.com/KlayPeter/peter-dsh 的 README，帮我把内容交付插件安装到 DeepSeek Harness 的 web profile。先检查插件是否已安装；需要下载源码时，检查当前目录和我提供的本地仓库路径，优先复用已有仓库，找不到再下载到 ~/.local/share/peter-dsh/source，不要克隆到当前业务项目。按文档把安装包保存到固定目录，检查依赖和安装结果，并告诉我如何从目标项目目录启动使用。

把示例中的插件名称换成你需要的插件即可；想自己操作，也可以按下面的步骤安装。

需要已能正常使用的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)、Git、Node.js 22+ 和 pnpm。目前插件尚未发布到 npm，从仓库打包安装。

**安装和使用分开：** 已安装的插件直接在目标项目启动 dsh 使用，不需要再次 clone 或 npm ci。安装时优先复用已有仓库；首次下载到下面的固定工具目录，不放进业务项目。

首次下载并准备依赖（目标目录已存在时，进入原目录检查，勿覆盖）：

```sh
mkdir -p "$HOME/.local/share/peter-dsh"
git clone https://github.com/KlayPeter/peter-dsh.git "$HOME/.local/share/peter-dsh/source"
cd "$HOME/.local/share/peter-dsh/source"
npm ci
```

然后在上方表格中选择插件，按其 README 完成打包、安装和首次使用。已有仓库可先 `git pull` 更新；缺少 pnpm 时执行 `npm install -g pnpm`。

各插件的安装步骤会将 `.tgz` 包保存到 `~/.local/share/peter-dsh/packages/`，避免安装来源依赖临时克隆目录。dsh 运行使用 profile 中已安装的插件；保留这些安装包，是为了以后重装或更新依赖。源码仓库及其 `node_modules` 不需要为插件运行一直保留，但源码可用于后续更新和开发。旧步骤安装的用户，请按新版安装步骤重新安装后再清理原目录。

安装时选择你实际使用的 dsh profile，例如 `web` 或 `tui`。安装后，从**要处理的目标项目目录**重启同一个 profile；插件默认以 dsh 启动目录作为工作目录。

## 其他 Agent 能用吗？

可以。三个插件都提供独立 CLI 和可安装的 Skill，供支持读取 Skill、执行本地命令的 Agent 使用。各插件 README 中都有对应步骤；只安装 Skill 不会自动安装 CLI 或其他依赖。

## 持续迭代，也欢迎交流

这个仓库会随着我的实际使用继续更新：完善已有插件，把新的需求做成新插件，逐步积累一套顺手的 Agent 工具。

如果你也遇到类似问题，欢迎试用、提 [Issue](https://github.com/KlayPeter/peter-dsh/issues)，或通过 PR 分享改进。反馈时可以附上使用场景、目标 Agent 和遇到的问题，方便复现与调整。

## 开发与许可

每个插件位于 `packages/` 下的独立目录，包含自己的实现、Skill、示例和说明。

```sh
npm test
npm run test:integration  # 内容交付的格式集成测试，需要 Chromium
```

三个插件已在隔离环境中按安装步骤实操验证，覆盖真实 dsh 工具调用与独立 CLI；已验证环境及限制见 [README 实操验证](docs/readme-verification.md)。

原创代码采用 [MIT](LICENSE)。第三方资料保留各自许可证，见[内容交付](packages/content-delivery/THIRD_PARTY.md)、[项目 AI 配置](packages/project-ai-init/THIRD_PARTY.md)与[交付验收](packages/delivery-acceptance/THIRD_PARTY.md)的许可说明。
