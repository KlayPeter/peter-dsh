# Peter DSH

把自己的 Agent 工作习惯做成可复用插件：一个仓库，多个独立插件包。优先解决真实需求，也让别人能按需拿走使用。

| 插件 | 用途 | 状态 |
| --- | --- | --- |
| [Content Delivery](packages/content-delivery/README.md) | 组织内容、改善表达、设计图示，导出 HTML / PDF / Word | v0.1.0 已实现 |
| [Project AI Init](packages/project-ai-init/README.md) | 按用户目标和项目内容搭建骨架、配置 AGENTS.md 与工作偏好 | v0.1.0 已实现 |
| 交付验收助手 | 将需求、实现、测试证据与验收条件对应起来 | 规划中 |

## 先试内容交付

需要 Node.js 22+。目前从仓库安装，尚未发布到 npm。

```sh
git clone https://github.com/KlayPeter/peter-dsh.git
cd peter-dsh
npm ci
npm run deliver -- setup-browser
npm run deliver -- export \
  --input packages/content-delivery/examples/design.md \
  --type design --formats html,pdf,docx --out output/design-v1
```

打开 `output/design-v1/document.html`、`document.pdf` 或 `document.docx`。再次导出请换一个目录名，工具不会覆盖旧交付。

这条命令转换已有内容。希望 Agent 先改善表达时，先读取对应指南：

```sh
npm run deliver -- guide --type design --mode improve --audience "后端工程师"
```

把指南交给当前 Agent，让它根据材料写出 Markdown 定稿，再检查、导出。支持 `prd`、`explainer`、`design`、`blog`、`research` 五类。完整步骤、DeepSeek Harness 安装与其他 Agent 接入见 [使用手册](packages/content-delivery/README.md)。

## 配置新项目或已有项目

```sh
npm run ai-init -- inspect --root /path/to/project
npm run ai-init -- init --root /path/to/project \
  --request "根据项目现有内容配置 AI 工作方式" --targets dsh,codex --dry-run
```

确认预览符合当前任务后去掉 `--dry-run` 应用。空项目支持 Node CLI、Python CLI、静态网页和文档骨架；其他技术栈由当前 Agent 搭建后再配置。默认 `peter` 偏好来自用户参考项目，其他人可选 `minimal` 或自定义预设。完整用法见 [Project AI Init README](packages/project-ai-init/README.md)。

## 为什么做成插件

它把每次重复交代的写作偏好、图示选择和交付步骤固化下来。PRD 更容易评审，设计文档更容易据此实现，调研更容易追溯依据；同一份定稿可以稳定输出多个格式。

内容引擎不依赖特定模型，也不调用模型 API。支持读取 Skill 并执行命令的 Agent 可以复用；DeepSeek Harness 另外提供原生工具适配。Skill 能引导写作，但不能保证模型永远按要求执行，所以确定性的检查与导出交给代码。

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
docs/                    # 两个插件的调研与实现记录
scripts/                 # 仓库维护脚本
```

每个插件持有自己的运行依赖、Skill 和 README。现阶段的共用规则放在内容交付包内部；两个插件目前独立发布；通用代码达到实际复用需求时再提取共享包，避免让独立安装依赖仓库外文件。

## 开发与来源

```sh
npm test
npm run test:integration  # 需要 Chromium；Linux 还需浏览器系统依赖和中文字体
npm pack --workspace @klaypeter/content-delivery
```

- [内容交付 Skill 调研](docs/content-delivery/skill-research.md)
- [项目 AI 配置初始化 Skill 调研](docs/project-ai-init/skill-research.md)
- [实现过程、验证与经验](docs/content-delivery/implementation.md)
- [第三方 Skill 与许可](packages/content-delivery/THIRD_PARTY.md)

Harness 包装方式参考 [Discussion #961](https://github.com/deepseek-ai/deepseek-harness/discussions/961) 和 [dsh-report-studio](https://github.com/ciceroyang/dsh-report-studio)，并按本机 Harness API 验证。没有复制其业务实现。

原创代码采用 [MIT](LICENSE)；`vendor/` 内材料保留各自许可证。
