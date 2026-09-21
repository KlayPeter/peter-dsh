# README 实操验证

验证日期：2026-09-21。对应代码：`37eefd7`；macOS arm64、Node.js 22.23、DeepSeek Harness 0.1.0-rc.6。

本轮从 GitHub 重新 clone，在独立目录执行 README 步骤；使用隔离的 `DSH_HOME` 和 npm 全局安装目录，没有沿用开发目录的依赖链接或个人 dsh 配置。

| 验证内容 | 结果 |
| --- | --- |
| npm ci、三个包分别 npm pack | 通过 |
| 三个 tarball 分别安装到同一 dsh web profile | 通过 |
| 真实 dsh 启动 | 加载 15 个工具、3 个运行时 Skill |
| 三个独立 CLI 的帮助与 Skill 安装 | 通过，包含参考资料 |
| 内容交付 | 指南、检查、含 Mermaid 的 HTML / PDF / DOCX 导出通过；独立 CLI 和真实 dsh 工具均调用成功 |
| 项目 AI 配置 | 预览、Python 骨架、新旧项目配置、sync、doctor、保留手写规则通过；骨架的帮助与 2 项测试通过 |
| 偏好迭代 | 更新、导出、另一项目应用通过；项目专属规则未混入个人模板 |
| CodeGraph | 安装固定版本、建立索引、加载 dsh MCP 覆盖层并调用查询通过 |
| 交付验收 | 建立合同、检查、导出报告通过；未检查返回 2，通过返回 0，文件变化后返回 2 |
| 真实 dsh 内的写入与执行 | 文档三格式导出、AI 配置计划与应用、验收文件检查与报告通过 |

“真实 dsh 调用”使用临时测试插件调用启动后注册的 ToolRuntime，未调用模型。这验证安装、依赖解析、组合加载和工具执行，但不证明模型一定会正确理解每一种自然语言请求。

自动检查：47 项测试全部通过；2 项格式集成测试通过，其中覆盖五类文档的 HTML / PDF / DOCX 实际生成。

## 阅读与环境限制

- HTML 图片已检查加载；PDF 已渲染抽查中文、表格与时序图。
- DOCX 已通过 LibreOffice 打开并转成 PDF 复查。无中文字体配置的预览环境会出现方块；需要给阅读器配置中文字体。字体不随 DOCX 嵌入，不能承诺任意接收端的效果一致。
- macOS 上内容插件与 dsh 自带 sharp 同进程加载时，观察到 `GNotificationCenterDelegate` 原生库重复加载警告。本轮启动与三格式导出成功；警告仍存在，不能据此承诺所有图片输入或运行环境均无问题。
- 尚未验证 Windows、其他 dsh 版本、每一种 Agent 的 Skill 自动发现，或由真实模型从自然语言开始的完整对话流程。

## 自行复验

先按各插件 README 在自己的 dsh profile 安装，再从目标项目启动。检查包列表只是第一步；继续让 Agent 调用对应工具，并打开实际产物核对。

仓库自动检查：

```sh
npm ci
npm run deliver -- setup-browser
npm test
npm run test:integration
```

自动检查之外，建议保留一个小项目，依次试一次文档导出、minimal 配置初始化和验收报告。升级 dsh 或插件后重新验证。安装所用 profile 必须与启动所用 profile 一致；命令中的示例路径需要换成实际存在的目录。
