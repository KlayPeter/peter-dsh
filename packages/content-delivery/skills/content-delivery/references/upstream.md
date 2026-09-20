# 上游 Skill 选择表

原文和参考资源已随包固定版本保存，不要一次全部加载。仓库布局为包目录的 vendor；用 install-skill 安装后为当前 Skill 根目录的 upstream。provenance.json 记录仓库、提交和逐文件哈希，根许可证保留在各来源目录。

从本参考文件定位：源码包为 ../../../vendor/；独立安装 Skill 为 ../upstream/（相对于本文件所在 references 目录，应使用 ../upstream）。在独立安装中直接从 Skill 根目录读取 upstream/，在源码中从包根目录读取 vendor/。

| 需要 | vendor 或 upstream 下的文件 |
| --- | --- |
| 句段表达细查 | softaworks/agent-toolkit/skills/writing-clearly-and-concisely/SKILL.md |
| 技术图语法 | softaworks/agent-toolkit/skills/mermaid-diagrams/SKILL.md |
| PRD 基础规范 | github/awesome-copilot/skills/prd/SKILL.md |
| PRD 完整范例 | product-on-purpose/pm-skills/skills/deliver-prd/SKILL.md |
| 判断图类型和价值 | product-on-purpose/pm-skills/skills/utility-mermaid-diagrams/SKILL.md |
| 文章插画 | JimLiu/baoyu-skills/skills/baoyu-article-illustrator/SKILL.md |
| 可选信息图 | JimLiu/baoyu-skills/skills/baoyu-infographic/SKILL.md |

阅读原文的相对引用时，以该上游 SKILL.md 的目录为基准。上游提及的外部工具或其他 Skill 并不一定已安装；本包未内置图像生成后端。优先遵循用户实际需求与本插件的处理方式，不为参考工作流重复提问或自动执行其发布步骤。
