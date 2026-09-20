import MarkdownIt from 'markdown-it';
import { validateProfile } from './guides.js';

export const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
export const escapeHtml = md.utils.escapeHtml;

export function parseMarkdown(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Markdown input is empty.');
  if (Buffer.byteLength(source) > 2 * 1024 * 1024) throw new Error('Markdown exceeds the 2 MiB input limit.');
  const tokens = md.parse(source, {});
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open') {
      const id = `section-${headings.length + 1}`;
      tokens[i].attrSet('id', id);
      headings.push({ id, level: Number(tokens[i].tag.slice(1)), text: plainText(tokens[i + 1].children) });
    }
  }
  return { tokens, headings, title: headings.find(h => h.level === 1)?.text || '文档' };
}

export function plainText(children = []) {
  return children.map(t => ['text', 'code_inline'].includes(t.type) ? t.content : t.type === 'image' ? t.content : ['softbreak', 'hardbreak'].includes(t.type) ? '\n' : '').join('');
}

export function checkMarkdown(source, { type = 'explainer' } = {}) {
  validateProfile(type);
  const { tokens, headings } = parseMarkdown(source);
  const findings = [];
  let previousLevel = 0;
  for (const token of tokens) {
    const line = (token.map?.[0] ?? 0) + 1;
    if (token.type === 'heading_open') {
      const level = Number(token.tag.slice(1));
      if (level > previousLevel + 1) findings.push({ code: 'heading-jump', severity: 'warning', line, message: '标题层级跳跃，检查阅读结构。' });
      previousLevel = level;
    }
    if (token.type !== 'inline') continue;
    const prose = (token.children || []).filter(t => t.type === 'text').map(t => t.content).join(' ');
    if (/\b(?:TODO|TBD|FIXME)\b|\[\[待写[:：]|待补充|待填写/i.test(prose)) findings.push({ code: 'placeholder', severity: 'error', line, message: '正文存在未完成占位符。' });
    if (prose.length > 500) findings.push({ code: 'dense-paragraph', severity: 'warning', line, message: '段落较长，检查是否可按论点拆分。' });
    for (const child of token.children || []) {
      if (child.type === 'image' && !child.content.trim()) findings.push({ code: 'image-alt', severity: 'warning', line, message: '图片缺少替代文字。' });
      if (child.type === 'image' && /^(?:https?:)?\/\//i.test(child.attrGet('src') || '')) findings.push({ code: 'remote-image', severity: 'error', line, message: '请先把图片保存到 Markdown 所在目录，导出不会联网下载。' });
    }
  }
  if (!headings.some(h => h.level === 1)) findings.push({ code: 'title', severity: 'warning', line: 1, message: '建议使用一级标题说明文档主题。' });
  if (headings.filter(h => h.level === 1).length > 1) findings.push({ code: 'multiple-titles', severity: 'warning', line: 1, message: '文档有多个一级标题，请检查层级。' });
  const review = {
    prd: ['需求能否对应可检查的验收条件？', '范围、异常场景和待确认项是否明确？'],
    explainer: ['目标读者能否理解术语和示例？', '是否说明适用条件与常见误解？'],
    design: ['接口、数据和关键交互能否据此实现？', '相关失败路径、取舍和验证方式是否充分？'],
    blog: ['观点是否有依据，是否保留作者语气？', '经历和数据是否真实或明确标为示例？'],
    research: ['关键结论能否定位到来源？', '比较口径、时效、反证和局限是否明确？'],
  }[type];
  return { status: findings.some(f => f.severity === 'error') ? 'blocked' : findings.length ? 'needs-review' : 'checks-passed', findings, readerReview: review, limitation: '自动检查只覆盖结构与显式标记，不证明事实正确或写作质量合格。' };
}
