# 检查与导出

将同一份定稿 Markdown 用于全部输出格式。CLI 不调用模型，不重写原文。

```sh
# 改写后对照原稿；原样排版可改用 check --input final.md
peter-deliver review --input final.md --original notes.md --type design
peter-deliver export --input final.md --type design --formats html,pdf,docx --out delivery-v1
```

源码仓库开发时可用 `npm run deliver -- ...`，或者 `node packages/content-delivery/src/cli.js ...`。Harness 工具可用时优先 `delivery_review` 与 `delivery_export`。

HTML 和普通 Word 不需要浏览器；PDF 或包含 Mermaid 的任何导出需要先运行 `peter-deliver setup-browser`。也可设置 PETER_DELIVERY_CHROMIUM 指向本机 Chromium 可执行文件。

图片使用 Markdown 文件所在目录内的相对路径。先取得并保存必要图片，导出不会联网下载，也不允许通过图片路径读取目录外文件。支持 PNG、JPEG、WebP；SVG 和公式需预先用适合工具渲染为图片，不能宣称为原生可编辑公式。

输出目录必须是新目录，避免覆盖旧交付。输出包括所选 document.html/pdf/docx、source.md、assets、checks.json、manifest.json。manifest 的哈希用于检测改变，不证明事实真实。源稿中的图片相对路径保持原样，HTML／PDF／DOCX 已嵌入图片；如要重新导出 source.md，请保留原始图片目录结构或改用 assets 中对应图片。

正文占位符默认阻止导出；确实交付草稿时可显式传 --allow-draft，清单记录草稿状态。图片丢失和图渲染错误始终报错，不以占位图替代成功。

交付前打开 HTML，并检查 PDF／Word 的页面：中文字体、图中文字、长表格、换页、代码、链接。结构自动检查通过不代替视觉与读者检查。

v0.1 支持常规 Markdown 标题、段落、强调、删除线、引用、嵌套列表、表格、链接、代码和图片。暂不提供原生数学公式、脚注、复杂 HTML 布局或 Word 修订功能；不要向用户承诺这些能力。

review 是只读复查：退出码 0 表示机械检查无提示，2 表示需复查，1 表示阻断或操作错误。数字和链接的集合对照不理解语义，也不检查代码中的数字；同数字对应错对象可能漏检，不同写法可能误报。必须由 Agent 对照上下文核实。原样排版模式可直接 check，不必改写或增加复查产物。
