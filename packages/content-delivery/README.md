# Content Delivery · 内容交付

让 Agent 把材料写清楚、讲明白、配上合适的图，再将同一份 Markdown 定稿交付为 HTML、PDF 和可编辑 Word。

**v0.1.0**：本地 CLI、可移植 Skill、DeepSeek Harness 工具适配。无需模型 API Key；写作由当前 Agent 完成，导出器不调用模型。

## 支持什么

| 类型参数 | 用途 | 重点 |
| --- | --- | --- |
| `prd` | PRD | 用户问题、范围、需求与可测试验收 |
| `explainer` | 技术或知识说明 | 概念、机制、例子、适用边界 |
| `design` | 技术详细设计 | 接口、数据、交互、失败路径与取舍 |
| `blog` | 博客文章 | 核心观点、论据、作者语气与来源 |
| `research` | 调研报告 | 研究问题、证据、比较与不确定性 |

| 模式 | Agent 的处理方式 |
| --- | --- |
| `format` | 原样排版：保留字句与顺序，不自动新增图或摘要 |
| `improve` | 表达优化：改善结构、措辞和图示，保留事实与条件 |
| `create` | 从资料创作：区分事实、分析、建议和待确认项 |

`--type` 用于选择指南和检查问题，不会自动把输入改写成对应文档。`export` 始终忠实转换输入；`--mode` 仅用于 `guide`。

## 安装与第一次导出

在仓库根目录，需要 Node.js 22+：

```sh
npm ci
npm run deliver -- setup-browser
npm run deliver -- check --input packages/content-delivery/examples/design.md --type design
npm run deliver -- export --input packages/content-delivery/examples/design.md \
  --type design --formats html,pdf,docx --out output/design-v1
```

普通 HTML / Word 不需要浏览器；PDF 或含 Mermaid 的任意格式需要 Chromium。浏览器在首次安装时下载，导出阶段不联网。Linux 若缺系统依赖，可运行 `npx playwright install --with-deps chromium`；中文环境需可用中文字体，例如 Noto Sans CJK。

也可复用已安装的 Chrome / Chromium，通过环境变量 `PETER_DELIVERY_CHROMIUM` 指定**可执行文件**。macOS 示例：

```sh
PETER_DELIVERY_CHROMIUM='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  npm run deliver -- export --input packages/content-delivery/examples/design.md \
  --formats html,pdf,docx --out output/design-v2
```

独立安装可先打包，再安装本地 tarball（当前包未发布 npm）：

```sh
npm pack --workspace @klaypeter/content-delivery
npm install -g ./klaypeter-content-delivery-0.1.0.tgz
peter-deliver --help
peter-deliver setup-browser
```

## 给其他 Agent 使用

核心 Skill 是 `skills/content-delivery/SKILL.md`。安装器将入口、引用资料和上游快照一起复制到指定位置，已有目录会拒绝覆盖。

```sh
# 在目标项目目录执行；先按上文安装 peter-deliver
peter-deliver install-skill --target .agents/skills
```

把 `--target` 改成你的 Agent 实际扫描的 Skill 目录，刷新其 Skill 发现机制。只装 Skill 不会自动安装 Node.js、CLI 或浏览器。尚未为每种 Agent 做专用集成测试；不能读取 Skill 的 Agent 仍可直接使用 `guide` 的输出。

可直接对 Agent 说：

> 用 content-delivery，把 notes.md 优化为面向新同事的技术说明。保留原文事实和限制，必要时加一张流程图，另存 final.md，检查后导出 HTML、PDF、Word 到 delivery-v1。

没有 Skill 自动发现功能时，按下面步骤手动驱动：

```sh
peter-deliver guide --type explainer --mode improve --audience "新加入团队的工程师"
# 让 Agent 读取返回的指南和原始材料，写出 final.md
peter-deliver check --input final.md --type explainer
peter-deliver export --input final.md --type explainer --formats html,pdf,docx --out delivery-v1
```

CLI 不提供虚假的“自动改写”：它返回指南、检查结构、导出文件，真正的创作发生在当前 Agent 会话里。

## DeepSeek Harness

采用纯 ESM Cordis 插件，`dsh.bundle.patch` 指向 `cordis.patch.yml`。可从**插件包路径或 tarball**安装；仓库根目录是 monorepo，不能直接把仓库根当作单插件安装。

```sh
# 仓库根目录：打包
npm pack --workspace @klaypeter/content-delivery
# 改为 tarball 的实际绝对路径；web 改为你使用的 profile
# dsh plugin 需要 pnpm
dsh plugin --profile web add /absolute/path/klaypeter-content-delivery-0.1.0.tgz
```

重启对应 profile。在运行 Harness 的同一账户下准备 Chromium。通过 npm 包安装的导出器使用它自己的 Playwright 浏览器版本；也可以在启动 Harness 时设置 `PETER_DELIVERY_CHROMIUM`。

| 工具 | 用途 |
| --- | --- |
| `delivery_guide` | 按模式、文档类型和读者返回写作指南 |
| `delivery_check` | 检查指定 Markdown 的结构和未完成标记 |
| `delivery_export` | 将指定 Markdown 导出至新目录 |

存在 `skills` 服务时还会注册 `content-delivery` 运行时 Skill；工具仅硬依赖 `tools` 服务。卸载插件会移除工具与 Skill 注册。

**文件路径以插件配置的 `workspaceRoot` 为根目录，默认是 Harness 进程启动目录，不是自动推断的每个会话目录。** 输入与输出参数使用相对路径；工具拒绝跳出该目录和越界符号链接。多项目或服务部署应显式设置配置，示意：

```yaml
# 对已安装 bundle 的覆盖层：workspace.yml
- id: peter-content-delivery
  config:
    workspaceRoot: /absolute/path/to/your/project
```

启动时传 `--patch ./workspace.yml`。从目标项目启动且不覆盖配置时，可直接使用默认值。通过 `delivery_guide` 取得规则后，Agent 用宿主提供的文件工具写出定稿，再调用检查与导出。

本地开发入口为 `src/dsh.js`。裸模块 `@deepseek-ai/dsh-tools` 必须能从该文件所在目录解析；它是可选 peer，普通 CLI 不依赖 Harness。与已有 Harness 开发环境联调时，应使用其同版本依赖，不要随意安装另一个 SDK 版本。

已在 Harness `0.1.0-rc.6` 的真实 Cordis、ToolRuntime、SkillRegistry 上验证注册和卸载。尚未执行付费模型驱动的端到端会话，也未承诺所有预览版 API 兼容。

## 图和格式

- 技术关系：优先 Mermaid 流程图、时序图等，保存 `.mmd` 图源并渲染为 PNG，三个格式使用同一张图。
- 数值比较：使用可追溯数据及确定性绘图工具，将图存成 PNG。当前插件不内置统计绘图库。
- 博客插画、信息图：附带 Baoyu Skill 作为可选参考。需要用户的图像生成后端；本包不包含该服务、凭据或自动生成图片的承诺。
- 图片：源 Markdown 所在目录内的相对路径；支持 PNG / JPEG / WebP。远程 URL、目录外图片、SVG 不直接加载。

支持标题、段落、强调、删除线、引用、嵌套列表、表格、链接、代码与图片。HTML 自包含并带目录；PDF 使用 A4 打印样式；Word 使用原生段落、标题、列表和表格，图以图片嵌入。Word 不保证与 PDF 相同分页。

Word 中文字体默认按操作系统选择 PingFang SC / Microsoft YaHei / Noto Sans CJK SC，接收者需安装相应字体或允许字体替换。可通过 `PETER_DELIVERY_CJK_FONT` 设置字体族名，例如 `Songti SC`。字体不会嵌入 DOCX；无中文字体的预览器可能显示方块，应安装或配置字体后复查。

v0.1 不提供原生数学公式、脚注、复杂内嵌 HTML、Word 修订、网络抓取、在线发布。公式等内容先转换为图片；普通代码保留文本，没有语法高亮。Markdown 的原始 HTML 会作为文本显示。

## 交付包与检查

```text
delivery-v1/
  source.md              # 输入原文
  document.html          # 按 formats 选择生成
  document.pdf
  document.docx
  assets/                # 图源与标准化图片
  checks.json            # 自动检查和读者复查问题
  manifest.json          # 版本、格式、源稿及产物 SHA-256
```

`source.md` 保留图片路径原文；如要再次导出它，请保留原始图片目录结构或改为 `assets/` 中的对应图片。交付的 HTML / PDF / DOCX 均已嵌入图片。

`checks-passed` 只表示结构与显式标记检查通过，不证明事实或写作质量。标题跳级等问题返回 `needs-review`；正文 TODO / TBD / 待填写等阻止正式导出。明确交付草稿才加 `--allow-draft`，清单会标记草稿。丢图、坏图仍失败，并清理本次新建的输出目录。

导出目录必须是新目录。检查命令遇到阻断返回退出码 1；警告返回 0，并在 JSON 中保留状态。`--no-toc` 可关闭 HTML / PDF 目录。

建议最后打开产物复查中文、图中文字、长表格与分页。哈希用来检查文件是否改变，不是事实认证。

## 开发、来源与许可

在仓库根运行 `npm test` 和 `npm run test:integration`。后者实际生成五类文档的三种格式，需要浏览器。见 [实现与验证记录](../../docs/content-delivery/implementation.md)。

7 个上游 Skill 以原始快照保存在 `vendor/`，按需读取，不一次注入所有工作流。固定提交、许可证与哈希见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 `vendor/provenance.json`。原创部分 MIT，上游部分各自授权。
