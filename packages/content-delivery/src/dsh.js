import { readFileSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { exportDocument, getGuide, checkMarkdown, profiles, skillRoot } from './index.js';

export const name = 'peter-content-delivery';
export const inject = ['tools'];

// Bundle tools operate on one explicit host workspace, not arbitrary host paths.
export async function workspacePath(root, input, { output = false } = {}) {
  if (!input || path.isAbsolute(input)) throw new Error('Use a path relative to the configured workspaceRoot.');
  const base = await realpath(root);
  const candidate = path.resolve(base, input);
  const inside = p => { const rel = path.relative(base, p); return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
  if (!inside(candidate)) throw new Error('Path escapes workspaceRoot.');
  let ancestor = output ? path.dirname(candidate) : candidate;
  while (true) {
    try { await stat(ancestor); break; } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!output) throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  if (!inside(await realpath(ancestor))) throw new Error('Symlink escapes workspaceRoot.');
  return candidate;
}

export function apply(ctx, config = {}) {
  const root = path.resolve(config.workspaceRoot || process.cwd());
  const output = { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] };
  const type = { type: 'string', enum: Object.keys(profiles), description: 'Document type; defaults to explainer.' };
  ctx.tools.register(defineTool({ name: 'delivery_guide', description: 'Get shared writing rules and exactly one document profile. The agent writes the Markdown; this tool does not call a model.', parameters: { type, mode: { type: 'string', enum: ['format', 'improve', 'create'] }, audience: { type: 'string' } }, output, async execute(args) { return getGuide(args); } }));
  ctx.tools.register(defineTool({ name: 'delivery_check', description: `Check Markdown structure and unfinished markers. Input is relative to ${root}. Does not verify facts.`, parameters: { input: { type: 'string', required: true }, type }, output, async execute(args, exec) { exec?.signal?.throwIfAborted(); return JSON.stringify(checkMarkdown(await readFile(await workspacePath(root, args.input), 'utf8'), { type: args.type }), null, 2); } }));
  ctx.tools.register(defineTool({ name: 'delivery_export', description: `Export existing Markdown to HTML/PDF/DOCX in a NEW directory. No rewriting. Paths are relative to ${root}. PDF and Mermaid require Chromium.`, parameters: { input: { type: 'string', required: true }, out: { type: 'string', required: true }, formats: { type: 'string', description: 'Comma-separated html,pdf,docx; default html.' }, type, allowDraft: { type: 'boolean' } }, output, async execute(args, exec) {
    exec?.signal?.throwIfAborted();
    const result = await exportDocument({ input: await workspacePath(root, args.input), out: await workspacePath(root, args.out, { output: true }), formats: (args.formats || 'html').split(',').map(f => f.trim()), type: args.type, allowDraft: args.allowDraft, signal: exec?.signal });
    return JSON.stringify(result, null, 2);
  } }));
  ctx.inject(['skills'], child => {
    child.skills.register({ name: 'content-delivery', description: '按 PRD、说明、详细设计、博客或调研类型改善表达与图示，交付 HTML、PDF、Word。', source: 'runtime', provider: name, resourceBase: { kind: 'directory', path: skillRoot }, content: readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '') + '\n\nHarness 环境中优先使用 delivery_guide、delivery_check、delivery_export 工具；工具路径以其描述中的 workspaceRoot 为准。' });
  });
}
