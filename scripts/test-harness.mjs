// Optional integration against an existing Harness installation. Never starts a model.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';

if (!process.env.DSH_MODULE_ROOT) throw new Error('Set DSH_MODULE_ROOT to the node_modules directory of your Harness installation; the plugin must also resolve the same dsh-tools peer.');
const require = createRequire(path.join(path.resolve(process.env.DSH_MODULE_ROOT), '.smoke.cjs'));
const load = name => import(pathToFileURL(require.resolve(name)).href);
const { Context } = await load('@deepseek-ai/cordis');
const { ToolRuntime } = await load('@deepseek-ai/dsh-tools');
const { SkillRegistry } = await load('@deepseek-ai/dsh-skill');
const { SystemPrompt } = await load('@deepseek-ai/dsh-system-prompt');
const plugin = await import('../packages/content-delivery/src/dsh.js');
const root = await mkdtemp(path.join(os.tmpdir(), 'peter-harness-'));
const ctx = new Context();
try {
  await writeFile(path.join(root, 'input.md'), '# 测试文档\n\n## 范围\n\n保留原文条件。');
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(ToolRuntime);
  await ctx.plugin(SkillRegistry);
  const fiber = await ctx.plugin(plugin, { workspaceRoot: root });
  assert.deepEqual(ctx.tools.schemas().map(t => t.name).sort(), ['delivery_check', 'delivery_export', 'delivery_guide', 'delivery_review']);
  assert.ok((await ctx.skills.list()).some(s => s.name === 'content-delivery'));
  let id = 0;
  const run = (name, args) => ctx.tools.execute({ callId: `smoke-${++id}`, name, arguments: args, signal: new AbortController().signal });
  for (const [name, args] of [
    ['delivery_guide', { type: 'design' }],
    ['delivery_check', { input: 'input.md' }],
    ['delivery_review', { input: 'input.md', original: 'input.md' }],
    ['delivery_export', { input: 'input.md', out: 'out', formats: 'html,docx' }],
  ]) {
    const result = await run(name, args);
    assert.equal(result.isError, false, JSON.stringify(result));
    assert.ok(result.content.some(c => c.type === 'text' && c.text.length > 0));
  }
  const outside = await run('delivery_check', { input: '../outside.md' });
  assert.equal(outside.isError, true);
  await symlink(os.tmpdir(), path.join(root, 'escape'));
  const escaped = await run('delivery_export', { input: 'input.md', out: 'escape/out' });
  assert.equal(escaped.isError, true);
  await fiber.dispose();
  assert.equal(ctx.tools.schemas().length, 0);
  assert.equal((await ctx.skills.list()).length, 0);
  console.log('Harness smoke passed: register, execute 4 tools, path guards, unregister.');
} finally {
  ctx.registry.delete(SkillRegistry);
  ctx.registry.delete(ToolRuntime);
  ctx.registry.delete(SystemPrompt);
  await rm(root, { recursive: true, force: true });
}
