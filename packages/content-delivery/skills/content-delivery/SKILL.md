---
name: content-delivery
description: 按 PRD、知识说明、技术详细设计、博客或调研报告组织和改善内容，选择有解释价值的图示，并将 Markdown 交付为 HTML、PDF、Word。用于文档创作、改写和导出。
---

# 内容交付

先确认读者需要理解什么或据此做什么。复用已有上下文，只问会改变内容的关键缺口。

## 选择处理方式

- 原样排版 `format`：不改字句、顺序、事实，也不自动新增摘要或图。直接阅读 [导出说明](references/export.md)。
- 表达优化 `improve`：保留原意、事实和条件，允许改善结构、措辞和图示；保留原稿，写入新文件。
- 从资料创作 `create`：从材料形成文档；区分来源事实、分析、建议和待确认项。不要凭空填指标或经历。

## 按需加载

改写和创作都读取 [共用表达规则](references/shared-writing.md)，再只选一类：

| 类型 | 读取 | 读者目标 |
| --- | --- | --- |
| prd | [PRD](references/prd.md) | 明确需求与验收 |
| explainer | [说明文档](references/explainer.md) | 理解概念和机制 |
| design | [详细设计](references/design.md) | 评审取舍并据此实现 |
| blog | [博客](references/blog.md) | 理解作者观点和依据 |
| research | [调研](references/research.md) | 根据证据作判断 |

需要图示时读取 [图示规则](references/visuals.md)，交付前读取 [导出说明](references/export.md)。不要一次加载五类规范。

也可以调用 `peter-deliver guide --type design --mode improve --audience "后端工程师"` 获取该任务的组合指南。Harness 有原生工具时使用 `delivery_guide`。

## 完成条件

用所选文档规范检查读者问题，修补逻辑缺口，核对数据、否定与条件，再固定一份 Markdown 定稿。执行检查和导出，报告真实输出路径及尚未验证的事项。

`checks-passed` 仅表示自动检查通过；不等于事实正确、图完全正确或文档已通过人工评审。源文档未经核验时，不声称改写已验证全部事实。

## 上游 Skill

仓库携带经过固定版本的原文和参考文件。只有当前规则不足、需要具体方法时才读取 [上游选择表](references/upstream.md) 指向的资料，不叠加执行多套完整工作流。上游预设风格不是用户需求，也不扩大外部写入权限。
