import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, ExternalHyperlink, InternalHyperlink, Bookmark, BorderStyle, LevelFormat, AlignmentType, Footer, PageNumber } from 'docx';
import { plainText } from './markdown.js';

const cjkFont = () => process.env.PETER_DELIVERY_CJK_FONT || (process.platform === 'darwin' ? 'PingFang SC' : process.platform === 'win32' ? 'Microsoft YaHei' : 'Noto Sans CJK SC');
const codeFont = () => ({ ascii: 'Consolas', hAnsi: 'Consolas', eastAsia: cjkFont() });

function imageRun(asset) {
  const ratio = Math.min(540 / asset.width, 450 / asset.height, 1);
  return new ImageRun({ type: 'png', data: asset.buffer, transformation: { width: Math.round(asset.width * ratio), height: Math.round(asset.height * ratio) }, altText: { title: asset.alt, description: asset.alt, name: asset.filename } });
}

function inlineRuns(tokens = [], assets, inherited = {}) {
  const result = [];
  const styles = { ...inherited };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'strong_open') styles.bold = true;
    else if (token.type === 'strong_close') styles.bold = inherited.bold;
    else if (token.type === 'em_open') styles.italics = true;
    else if (token.type === 'em_close') styles.italics = inherited.italics;
    else if (token.type === 's_open') styles.strike = true;
    else if (token.type === 's_close') styles.strike = inherited.strike;
    else if (token.type === 'link_open') {
      let end = i + 1;
      while (end < tokens.length && tokens[end].type !== 'link_close') end++;
      const children = inlineRuns(tokens.slice(i + 1, end), assets, { ...styles, color: '17615F', underline: {} });
      const href = token.attrGet('href');
      result.push(href.startsWith('#') ? new InternalHyperlink({ anchor: href.slice(1).replaceAll('-', '_'), children }) : new ExternalHyperlink({ link: href, children }));
      i = end;
    } else if (token.type === 'image') result.push(imageRun(assets.get(token)));
    else if (token.type === 'softbreak') result.push(new TextRun({ text: ' ', ...styles }));
    else if (token.type === 'hardbreak') result.push(new TextRun({ text: '', break: 1, ...styles }));
    else if (token.type === 'code_inline') result.push(new TextRun({ text: token.content, ...styles, font: codeFont(), shading: { fill: 'F1F4F3' } }));
    else if (token.type === 'text') result.push(new TextRun({ text: token.content, ...styles }));
  }
  return result;
}

export async function renderDocx(document, assets) {
  const blocks = [];
  const numbering = [];
  const lists = [];
  const items = [];
  let quote = 0;
  let listId = 0;
  const tokens = document.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (['bullet_list_open', 'ordered_list_open'].includes(token.type)) {
      const reference = `list-${++listId}`;
      const ordered = token.type === 'ordered_list_open';
      const depth = Math.min(lists.length, 8);
      numbering.push({ reference, levels: Array.from({ length: 9 }, (_, level) => ({ level, format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET, text: ordered ? `%${level + 1}.` : '•', start: Number(token.attrGet('start') || 1), alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } } })) });
      lists.push({ reference, depth });
    } else if (['bullet_list_close', 'ordered_list_close'].includes(token.type)) lists.pop();
    else if (token.type === 'list_item_open') items.push({ used: false });
    else if (token.type === 'list_item_close') items.pop();
    else if (token.type === 'blockquote_open') quote++;
    else if (token.type === 'blockquote_close') quote--;
    else if (token.type === 'heading_open') {
      const text = tokens[++i];
      const level = Number(token.tag.slice(1));
      const runs = inlineRuns(text.children, assets);
      blocks.push(new Paragraph({ heading: level === 1 && blocks.length === 0 ? HeadingLevel.TITLE : HeadingLevel[`HEADING_${level}`], keepNext: true, children: [new Bookmark({ id: token.attrGet('id').replaceAll('-', '_'), children: runs })] }));
    } else if (token.type === 'paragraph_open') {
      const content = tokens[++i];
      const list = lists.at(-1);
      const item = items.at(-1);
      const numbered = list && item && !item.used;
      if (item) item.used = true;
      blocks.push(new Paragraph({ children: inlineRuns(content.children, assets), ...(numbered ? { numbering: { reference: list.reference, level: list.depth } } : list ? { indent: { left: 360 * (list.depth + 1) } } : {}), ...(quote ? { indent: { left: quote * 320 }, style: 'Quote' } : {}) }));
    } else if (['fence', 'code_block'].includes(token.type)) {
      const asset = assets.get(token);
      if (asset) blocks.push(new Paragraph({ children: [imageRun(asset)], alignment: AlignmentType.CENTER }));
      else {
        const lines = token.content.replace(/\n$/, '').split('\n');
        blocks.push(new Paragraph({ style: 'Code', children: lines.map((line, index) => new TextRun({ text: line || ' ', ...(index ? { break: 1 } : {}) })) }));
      }
    } else if (token.type === 'table_open') {
      const rows = [];
      let cells = [];
      let isHead = false;
      for (i++; i < tokens.length && tokens[i].type !== 'table_close'; i++) {
        const current = tokens[i];
        if (current.type === 'thead_open') isHead = true;
        if (current.type === 'thead_close') isHead = false;
        if (current.type === 'tr_open') cells = [];
        if (current.type === 'inline') cells.push(current.children || []);
        if (current.type === 'tr_close') rows.push({ cells, isHead });
      }
      const count = Math.max(...rows.map(r => r.cells.length));
      const weights = Array.from({ length: count }, (_, col) => Math.min(35, Math.max(5, ...rows.map(r => plainText(r.cells[col]).length || 5))));
      const total = weights.reduce((a, b) => a + b, 0);
      const widths = weights.map(w => Math.round(w / total * 9360));
      const borders = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map(k => [k, { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' }]));
      blocks.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths, borders, rows: rows.map((row, rowIndex) => new TableRow({ tableHeader: row.isHead, children: row.cells.map((cell, col) => new TableCell({ width: { size: widths[col], type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 140, right: 140 }, shading: { fill: row.isHead ? 'EAF0EE' : rowIndex % 2 === 0 ? 'F7F9F8' : 'FFFFFF' }, children: [new Paragraph({ children: inlineRuns(cell, assets, { bold: row.isHead, size: 20 }), spacing: { after: 60, line: 280 } })] })) })) }));
      blocks.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    } else if (token.type === 'hr') blocks.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' } }, spacing: { after: 180 } }));
  }
  const font = { ascii: 'Arial', hAnsi: 'Arial', cs: 'Arial', eastAsia: cjkFont() };
  const headingStyles = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`heading${i + 1}`, { run: { font, bold: true, italics: false, color: '000000', size: [34, 29, 25, 23, 22, 22][i] }, paragraph: { keepNext: true, outlineLevel: i, spacing: { before: 280, after: 140 } } }]));
  const styles = {
    default: { document: { run: { font, size: 22, color: '202A32' }, paragraph: { spacing: { after: 160, line: 330 }, widowControl: true } }, title: { run: { font, size: 40, bold: true, color: '000000' }, paragraph: { spacing: { before: 0, after: 280 } } }, ...headingStyles },
    paragraphStyles: [
      { id: 'Code', name: 'Code', basedOn: 'Normal', run: { font: codeFont(), size: 18 }, paragraph: { shading: { fill: 'F1F4F3' }, spacing: { before: 120, after: 180, line: 270 } } },
      { id: 'Quote', name: 'Quote', basedOn: 'Normal', run: { color: '59656E' } },
    ],
  };
  const doc = new Document({ title: document.title, creator: 'Peter Content Delivery', styles, numbering: { config: numbering }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '59656E' })] })] }) }, children: blocks }] });
  return Packer.toBuffer(doc);
}
