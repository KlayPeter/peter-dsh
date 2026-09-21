import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const skillRoot = fileURLToPath(new URL('../skills/content-delivery/', import.meta.url));
export const profiles = Object.freeze({
  prd: 'PRD 产品需求文档',
  explainer: '技术与知识说明',
  design: '技术详细设计',
  blog: '博客文章',
  research: '调研报告',
});
export const modes = ['format', 'improve', 'create'];

export function validateProfile(type) {
  if (!Object.hasOwn(profiles, type)) throw new Error(`Unknown document type: ${type}. Choose ${Object.keys(profiles).join(', ')}.`);
  return type;
}

export async function getGuide({ type = 'explainer', mode = 'improve', audience = '熟悉基本概念的中文读者' } = {}) {
  validateProfile(type);
  if (!modes.includes(mode)) throw new Error(`Unknown mode: ${mode}. Choose ${modes.join(', ')}.`);
  const paths = mode === 'format'
    ? ['references/export.md']
    : ['references/shared-writing.md', `references/${type}.md`, 'references/visuals.md', 'references/export.md'];
  const sections = await Promise.all(paths.map(async p => `<!-- ${p} -->\n${await readFile(new URL(p, new URL('../skills/content-delivery/', import.meta.url)), 'utf8')}`));
  return `# 内容交付任务指南\n\n文档类型：${profiles[type]}\n处理方式：${mode}\n目标读者：${audience}\n参考文件根目录：${skillRoot}\n\n${mode === 'format' ? '保留输入原文，直接转换；不要改写或自动增加图示。' : '由当前 Agent 根据读者要解决的问题组织内容，将定稿保存为新的 Markdown；改写后用 delivery_review 或 CLI review 对照原稿，核实数字、来源和语义变化，再调用导出工具。工具本身不调用模型、不润色正文。'}\n\n${sections.join('\n\n')}`;
}
