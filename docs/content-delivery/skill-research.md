# 内容交付：Skill 调研与设计建议

调研日期：2026-09-20。范围：让 PRD、技术／知识说明、技术详细设计、博客文章、调研报告表达清楚、逻辑完整、易读并适度可视化。

结论：采用统一内容工作流，按文档类型加载写作规范，再由工具完成图示和 HTML／PDF／Word 导出。外部 Skill 作为经过取舍的参考，避免把多套完整工作流同时注入。

调研阶段读取了候选 SKILL.md、官方写作方法以及本地已有 Skill；当时没有安装新 Skill，也未运行候选的完整生成流程。后续下载与接入情况见文末“依赖和再分发”。安装量只用于辅助筛选，不代表中文效果或导出质量已验证。

## 重点候选

| 候选与来源 | 适用范围 | 值得采用的部分 | 适配时的取舍 |
| --- | --- | --- | --- |
| [doc-coauthoring / Anthropic](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | 全部结构化文档 | 补齐上下文、迭代结构、从陌生读者角度检验文档 | 原流程交互较多；已有信息不重复问，读者检查不绑定 Claude 专用工具 |
| [writing-clearly-and-concisely / softaworks](https://github.com/softaworks/agent-toolkit/tree/main/skills/writing-clearly-and-concisely) | 五类文档的共用表达 | 段落聚焦、具体措辞、减少空话与冗余 | 英语语法条款不直接搬到中文；不能为了简短删掉必要论证 |
| [prd / GitHub awesome-copilot](https://github.com/github/awesome-copilot/blob/main/skills/prd/SKILL.md) | PRD | 目标、用户故事、验收标准与范围 | 强制问答和固定章节改为按需求加载；示例里的指标不是本项目目标 |
| [deliver-prd / product-on-purpose](https://github.com/product-on-purpose/pm-skills/blob/main/skills/deliver-prd/SKILL.md) | PRD 的补充参考 | 可测试要求、范围边界，AI 功能单独定义评估 | 社区使用规模较小；不全盘接入它的项目记忆机制 |
| [mermaid-diagrams / softaworks](https://github.com/softaworks/agent-toolkit/blob/main/skills/mermaid-diagrams/SKILL.md) | 技术说明、设计、PRD | 多种图类型及示例，图源随文档维护 | 不照搬“总要画图”的倾向；语法和渲染支持由选定版本实测 |
| [utility-mermaid-diagrams / product-on-purpose](https://github.com/product-on-purpose/pm-skills/blob/main/skills/utility-mermaid-diagrams/SKILL.md) | 图示选择和评审 | 先证明图比文字清楚，再选图类型、渲染验证 | 适合作为图示规划参考，图片导出仍需独立工具 |
| [content-research-writer / ComposioHQ](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/content-research-writer/SKILL.md) | 博客、调研报告 | 大纲、研究、引用和作者风格 | 某些示例用吸引人的数字或经历做开头；本项目只接受有依据的事实，示例不能当真实数据；再分发许可待核实 |
| [baoyu-article-illustrator / JimLiu](https://github.com/JimLiu/baoyu-skills/blob/main/skills/baoyu-article-illustrator/SKILL.md) | 博客、知识说明 | 按文章结构确定配图位置与用途，统一视觉风格 | 作为可选插画流程，依赖可用图像后端，不替代精确技术绘图 |
| [baoyu-infographic / JimLiu](https://github.com/JimLiu/baoyu-skills/blob/main/skills/baoyu-infographic/SKILL.md) | 概念总览、视觉摘要 | 将信息布局与视觉风格分开选择 | 密集文字图片需检查；研究数据优先确定性绘图，不让图像模型重写数值 |

## 使用规模快照

以下是 Skills CLI／skills.sh 在调研时显示的近似安装数，仓库 Star 来自 GitHub API。Star 是整个仓库的数据，不是某个 Skill 的评分。

| 候选 | 安装量 | 仓库 Star |
| --- | ---: | ---: |
| [doc-coauthoring](https://skills.sh/anthropics/skills/doc-coauthoring) | 85.1K | 177,220 |
| [writing-clearly-and-concisely](https://skills.sh/softaworks/agent-toolkit/writing-clearly-and-concisely) | 4.2K | 2,485 |
| [prd](https://skills.sh/github/awesome-copilot/prd) | 23.3K | 本次未记录 |
| [deliver-prd](https://skills.sh/product-on-purpose/pm-skills/deliver-prd) | 903 | 685 |
| [mermaid-diagrams](https://skills.sh/softaworks/agent-toolkit/mermaid-diagrams) | 4.9K | 2,485 |
| [utility-mermaid-diagrams](https://skills.sh/product-on-purpose/pm-skills/utility-mermaid-diagrams) | 667 | 685 |
| [content-research-writer](https://skills.sh/composiohq/awesome-claude-skills/content-research-writer) | 7.4K | 75,361 |
| [baoyu-article-illustrator](https://skills.sh/jimliu/baoyu-skills/baoyu-article-illustrator) | 31.3K | 26,024 |

还查看了 [riekelt/technical-writer](https://github.com/riekelt/technical-writer) 的 technical-writing 和 writing-design-docs。搜索显示约 9.3K／9.1K 安装，但仓库只有 16 Star；其结论先行、来源追溯和成本说明可参考，强制标点、章节编号等属于作者偏好，不作为本项目默认规范。

## 本地已有能力

已读取本机以下 Skill，路径用于说明本次来源，不是未来用户的安装依赖：

- `/Users/admin/.agents/skills/writing-clearly-and-concisely/SKILL.md`
- `/Users/admin/.codex/skills/atlas-readable-html/SKILL.md`
- `/Users/admin/.codex/skills/atlas-markdown-to-html/SKILL.md`

其中 atlas-readable-html 对事实、条件、引用和不确定性的保留要求适合作为表达优化约束；atlas-markdown-to-html 将转换与改写分开，适合作为“原样排版”的参考。二者偏向已有正文处理，本项目还需补上资料创作及五类文档结构。其本地路径与 Atlas 特定 JSON 输出都不应成为公共插件的硬依赖。

## 不依赖 Skill 的方法参考

- [Google Technical Writing One](https://developers.google.com/tech-writing/one)：适合建立面向读者的技术表达规范，补充英语 Skill 向中文转化后的可读性检查。
- [Diátaxis Explanation](https://diataxis.fr/explanation/)：说明文档围绕理解展开，避免与操作步骤、教程和完整参考手册混写。它适合第二类文档，不强套到全部五类。
- [arc42](https://arc42.org/overview/)：帮助技术详细设计检查边界、结构、运行、决策及风险；按设计规模裁剪。
- [C4](https://c4model.com/diagrams)：按不同读者选择架构抽象层级，避免一张图混入系统、模块和代码全部细节。

这些是组织内容的方法，不是必须安装的软件。

## 推荐组合

第一版的通用规则应覆盖：读者和阅读目标、材料依据、段落结构、术语一致、条件保留、图示选择、读者检查。五类文档分别加载独立规范。

内容框架优先参考 doc-coauthoring；清晰表达参考 writing-clearly-and-concisely 和本地 atlas-readable-html；PRD 参考 GitHub prd 并补充 deliver-prd；技术说明参考 Diátaxis；详细设计参考 arc42 和 C4；博客和研究参考 content-research-writer 的来源与结构管理。

图示规划参考 utility-mermaid-diagrams，技术绘图参考 mermaid-diagrams。Baoyu 插画和信息图先保留为可选增强，不成为所有文档的必经步骤。

文档源稿、图示源、渲染后的图和引用索引共同构成内容包；导出使用同一份内容包，避免三种格式语义漂移。具体需求见 [插件使用说明](../../packages/content-delivery/README.md)。

## 依赖和再分发

实现更新：现已下载 7 个 Skill 的固定版本原文及相关资料，保留许可证和逐文件哈希；见 [第三方声明](../../packages/content-delivery/THIRD_PARTY.md)。下面保留调研时的许可判断。

后续若直接引入，逐项记录来源、固定版本、修改与许可证，并保留所需声明。已看到 softaworks 与 JimLiu 仓库的 MIT、product-on-purpose 的 Apache-2.0，以及 GitHub prd 文件的 MIT 声明。

Anthropic 仓库包含不同许可安排；其 [README](https://github.com/anthropics/skills/blob/main/README.md) 特别将 docx/pdf/pptx/xlsx 标为 source-available，不能把仓库中所有内容视为同一种开源许可。ComposioHQ 仓库本次未取得明确的根许可证，直接复制前需进一步核对。

## 可选试用命令

以下仅记录检索得到的安装方式，本次未执行。安装前选择实际目标 Agent 和范围；已有 Skill 无需重复安装。

```sh
npx skills add https://github.com/anthropics/skills --skill doc-coauthoring
npx skills add https://github.com/softaworks/agent-toolkit --skill writing-clearly-and-concisely
npx skills add https://github.com/github/awesome-copilot --skill prd
npx skills add https://github.com/product-on-purpose/pm-skills --skill deliver-prd
npx skills add https://github.com/softaworks/agent-toolkit --skill mermaid-diagrams
npx skills add https://github.com/product-on-purpose/pm-skills --skill utility-mermaid-diagrams
npx skills add https://github.com/ComposioHQ/awesome-claude-skills --skill content-research-writer
npx skills add https://github.com/JimLiu/baoyu-skills --skill baoyu-article-illustrator
npx skills add https://github.com/JimLiu/baoyu-skills --skill baoyu-infographic
```
