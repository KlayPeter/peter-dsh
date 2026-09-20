import MarkdownIt from 'markdown-it';
import { escapeHtml } from './markdown.js';

export const stylesheet = `
:root{color-scheme:light;--ink:#202a32;--muted:#59656e;--line:#d9e0e4;--accent:#17615f}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f5f6f4;color:var(--ink);font:17px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:880px;margin:44px auto;padding:48px 62px 64px;background:white;border:1px solid var(--line)}h1,h2,h3,h4,h5,h6{color:#17252b;line-height:1.4;break-after:avoid;overflow-wrap:anywhere}h1{font-size:2rem;margin:0 0 1.2em;letter-spacing:-.025em}h2{font-size:1.4rem;margin:2em 0 .8em}h3{font-size:1.15rem;margin:1.7em 0 .7em}p{margin:1em 0;overflow-wrap:anywhere}a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px;overflow-wrap:anywhere}nav{border-block:1px solid var(--line);padding:16px 0;margin:24px 0 32px;font-size:.88rem}nav ul{list-style:none;padding:0;margin:0}nav li{margin:3px 0}nav a{text-decoration:none}nav .depth-3{padding-left:20px}nav .depth-4,nav .depth-5,nav .depth-6{padding-left:36px}ul,ol{padding-left:1.7em}li{margin:.25em 0}blockquote{margin:1.5em 0;padding:0 0 0 1em;border-left:3px solid #bacbc8;color:var(--muted)}code{font: .88em/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;background:#f1f4f3;padding:.1em .28em;border-radius:3px}pre{padding:18px;background:#f1f4f3;border:1px solid #e4e9e7;overflow:auto;line-height:1.65}pre code{padding:0;background:none}img{max-width:100%;height:auto;vertical-align:middle}figure{margin:24px 0;text-align:center;break-inside:avoid}figure img{max-height:700px;object-fit:contain}.table-scroll{overflow:auto;margin:20px 0}table{width:100%;border-collapse:collapse;font-size:.9em}th,td{padding:10px 13px;border:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf0ee;color:#17252b}tr:nth-child(even) td{background:#f8faf9}hr{border:0;border-top:1px solid var(--line);margin:2em 0}del{color:var(--muted)}
@media(max-width:680px){body{font-size:16px}main{margin:0;padding:28px 22px;border:0}h1{font-size:1.65rem}}
@page{size:A4;margin:18mm 17mm 20mm}
@media print{body{background:white;font-size:10.5pt;line-height:1.65}main{max-width:none;margin:0;padding:0;border:0}h1{font-size:23pt}h2{font-size:16pt;margin-top:1.4em}h3{font-size:12pt}nav{font-size:9pt}nav ul{columns:2}nav li{break-inside:avoid}p,li{orphans:3;widows:3}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}pre code{white-space:pre-wrap}.table-scroll{overflow:visible}table{table-layout:fixed;font-size:9pt}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:7px}figure img{max-height:210mm}a{color:inherit}h1,h2,h3,h4{color:#000}}
`;

export function renderHtml(document, assets, { toc = true } = {}) {
  const renderer = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const originalFence = renderer.renderer.rules.fence;
  renderer.renderer.rules.fence = (tokens, index, options, env, self) => {
    const asset = assets.get(tokens[index]);
    return asset ? `<figure><img alt="${escapeHtml(asset.alt)}" src="data:image/png;base64,${asset.buffer.toString('base64')}"></figure>\n` : originalFence(tokens, index, options, env, self);
  };
  renderer.renderer.rules.image = (tokens, index) => {
    const asset = assets.get(tokens[index]);
    if (!asset) throw new Error('Image resource was not prepared.');
    return `<img alt="${escapeHtml(asset.alt)}" src="data:image/png;base64,${asset.buffer.toString('base64')}">`;
  };
  renderer.renderer.rules.table_open = () => '<div class="table-scroll"><table>\n';
  renderer.renderer.rules.table_close = () => '</table></div>\n';
  const body = renderer.renderer.render(document.tokens, renderer.options, {});
  const navigation = toc && document.headings.length > 1 ? `<nav aria-label="目录"><ul>${document.headings.filter(h => h.level !== 1).map(h => `<li class="depth-${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ul></nav>` : '';
  // The first title stays above navigation; the body itself is never rewritten.
  const titleEnd = body.indexOf('</h1>');
  const content = titleEnd >= 0 ? body.slice(0, titleEnd + 5) + navigation + body.slice(titleEnd + 5) : navigation + body;
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(document.title)}</title><style>${stylesheet}</style></head><body><main>${content}</main></body></html>\n`;
}
