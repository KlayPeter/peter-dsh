# 第三方材料

以下 Skill 为固定提交的原始快照，未修改原文，不会在安装时自动执行其脚本或工作流。适配和中文规则在本包 `skills/content-delivery/` 内单独维护。

| 上游 | Skill | 固定提交 | 许可 |
| --- | --- | --- | --- |
| [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) | `writing-clearly-and-concisely`, `mermaid-diagrams` | [3027f20f3181](https://github.com/softaworks/agent-toolkit/tree/3027f20f3181758385a1bb8c022d4041dfb4de84) | [MIT](vendor/softaworks/agent-toolkit/LICENSE) |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | `prd` | [4f4796f0bf30](https://github.com/github/awesome-copilot/tree/4f4796f0bf30e105700f97ed8408c12b6aa95e06) | [MIT](vendor/github/awesome-copilot/LICENSE) |
| [product-on-purpose/pm-skills](https://github.com/product-on-purpose/pm-skills) | `deliver-prd`, `utility-mermaid-diagrams` | [1cef1a9eae10](https://github.com/product-on-purpose/pm-skills/tree/1cef1a9eae10017389863d51e289e0ae41e17fcb) | [Apache-2.0](vendor/product-on-purpose/pm-skills/LICENSE) |
| [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) | `baoyu-article-illustrator`, `baoyu-infographic` | [1567581c26ec](https://github.com/JimLiu/baoyu-skills/tree/1567581c26ec29f4216c6e6835415bf30343b0e3) | [MIT](vendor/JimLiu/baoyu-skills/LICENSE) |

逐文件来源和 SHA-256 见 [provenance.json](vendor/provenance.json)。各仓库 LICENSE 与所选 Skill 的配套参考文件随包分发；原作者署名保留。

仓库维护者可在根目录运行 `python3 scripts/vendor-skills.py` 恢复相同快照。更新版本需修改固定提交、重新核查许可和差异，并运行测试；脚本拒绝直接覆盖已修改的快照文件。

参考但未再分发：[Anthropic doc-coauthoring](https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring)、[Composio content-research-writer](https://github.com/ComposioHQ/awesome-claude-skills/tree/master/content-research-writer)。本次未取得足够明确的所选内容再分发许可，保留链接。

软件依赖 `markdown-it`、`mermaid`、`docx`、`playwright`、`sharp` 通过包管理器安装，适用各自包内许可证。Playwright 下载的浏览器和操作系统字体不打包进本插件。
