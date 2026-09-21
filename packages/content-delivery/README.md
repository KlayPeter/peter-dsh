# Content Delivery · 从零散材料到完整交付

把笔记、需求和技术资料交给 Agent，整理成读者能看懂、你能拿去评审或分享的文档，再一次导出 HTML、PDF 和可编辑 Word。

它把“写清楚”和“交付文件”接在一起：按用途选择文档结构，按需要补充图示，最后从同一份 Markdown 定稿生成多个格式。

## 什么时候用它？

| 手头的任务 | 它怎样帮你 | 交付给谁 |
| --- | --- | --- |
| 需求还散在笔记里，准备开评审 | 引导 Agent 梳理问题、范围、流程和验收条件，形成 PRD | 产品、设计与开发团队 |
| 技术方案写了很多，别人还是看不懂 | 调整解释顺序，补充例子，用流程图或时序图说明关系 | 评审同事、新加入的成员 |
| 做完调研，想把结果讲清楚 | 围绕研究问题组织证据、比较、结论与局限 | 决策者、团队或文章读者 |
| 文稿已经定了，还要准备几种文件 | 保留定稿内容，输出网页、PDF 和可继续编辑的 Word | 不同阅读、编辑习惯的接收者 |

## 一次使用，会得到什么？

例如，你对 Agent 说：

> 把 notes.md 整理成给新同事看的技术说明。保留事实和限制，必要时加流程图，另存 final.md，导出 HTML、PDF、Word 到 delivery-v1。

Agent 先按指南整理文稿，再调用检查和导出工具。完成后，你会得到：

```text
final.md                  # 整理后的文稿，可继续修改
delivery-v1/
  document.html           # 浏览器阅读与分享
  document.pdf            # 固定版式，方便发送
  document.docx           # 继续编辑与协作
  source.md               # 本次导出的原稿
  assets/                 # 本次使用的图示资源
  checks.json             # 检查结果与复查提示
  manifest.json           # 产物清单
```

写作和图示选择由当前 Agent 完成，程序负责检查与导出。导出命令本身不会自动改写文章；事实、来源和最终阅读效果仍需要复查。

当前版本 **v0.1.1**，支持 DeepSeek Harness、独立 CLI 和可移植 Skill。复用当前 Agent 的模型，无需额外模型 API Key。

[安装到 dsh](#第一次使用安装到-deepseek-harness) · [其他 Agent](#给其他-agent-使用) · [直接用命令行导出](#安装与第一次导出)

## 第一次使用：安装到 DeepSeek Harness

已能正常使用 dsh 的用户，按以下顺序操作。需要 Git、Node.js 22+ 和 pnpm；没有 pnpm 时先执行 `npm install -g pnpm`。以下是 macOS / Linux 终端命令。

```sh
# 已下载仓库的用户直接进入现有 peter-dsh 目录
git clone https://github.com/KlayPeter/peter-dsh.git
cd peter-dsh
npm ci
npm pack --workspace @klaypeter/content-delivery
dsh plugin --profile web add "$PWD/klaypeter-content-delivery-0.1.1.tgz"
# 为 PDF 和 Mermaid 图准备 Chromium；首次需要下载
npm run deliver -- setup-browser
```

`web` 换成你实际使用的 profile。关闭旧 dsh，将下面路径换成**存放待处理文档的项目目录**，重新启动：

```sh
cd /path/to/your-project
dsh --profile web
```

在该目录准备 `notes.md`，然后对 dsh 说：

> 使用 content-delivery，把 notes.md 优化为面向新同事的技术说明，必要时配流程图，另存 final.md，检查后导出 HTML、PDF 和 Word 到 delivery-v1。

完成后打开目标项目中的 `delivery-v1/document.html`、`document.pdf` 或 `document.docx`。再次导出使用新目录名。无需额外模型 API Key，也无需逐个安装上游 Skill。

想先验证安装，可说“调用 delivery_guide，获取技术说明文档的表达优化指南”。没有工具时先检查 profile 是否一致、dsh 是否重启。环境与安装排查见[仓库安装指南](https://github.com/KlayPeter/peter-dsh#安装到-deepseek-harness)；Linux 浏览器系统依赖见下方说明。

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
npm install -g ./klaypeter-content-delivery-0.1.1.tgz
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

## DeepSeek Harness 配置与工具

安装步骤见本文开头。在运行 Harness 的同一账户下准备 Chromium；也可以在启动 Harness 时设置 `PETER_DELIVERY_CHROMIUM` 指向已有浏览器可执行文件。

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

v0.1.1 将本地图片转换放到独立子进程，避免插件的 sharp 原生库与 dsh 在同一进程重复加载。Mermaid 图片尺寸直接从生成的 PNG 读取。图片格式、路径和大小限制保持不变。

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

在仓库根运行 `npm test` 和 `npm run test:integration`。后者实际生成五类文档的三种格式，需要浏览器。见 [实现与验证记录](https://github.com/KlayPeter/peter-dsh/blob/main/docs/content-delivery/implementation.md)。

7 个上游 Skill 以原始快照保存在 `vendor/`，按需读取，不一次注入所有工作流。固定提交、许可证与哈希见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 `vendor/provenance.json`。原创部分 MIT，上游部分各自授权。

## 从 v0.1.0 升级

在插件仓库目录执行以下命令，再关闭并重新启动相同的 dsh profile：

```sh
git pull
npm ci
npm pack --workspace @klaypeter/content-delivery
dsh plugin --profile web add "$PWD/klaypeter-content-delivery-0.1.1.tgz"
```

独立 CLI 用户改用 `npm install -g ./klaypeter-content-delivery-0.1.1.tgz`。无需修改 dsh 自身依赖或重新下载 Chromium。
