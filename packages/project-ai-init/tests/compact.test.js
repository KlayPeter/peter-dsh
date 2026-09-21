import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initialize, planProject, applyPlan, doctor, inspectProject } from '../src/index.js';
import { exportPreferences } from '../src/preferences.js';
async function temp(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'peter-compact-'));
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}
async function put(root, file, text) { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), text); }
const read = (root, file) => readFile(path.join(root, file), 'utf8');
const init = (root, options = {}) => initialize({ root, request: '配置当前项目', starter: 'none', ...options });

test('compact default puts actionable mixed-runner commands in one entry without MCP or extra docs', async t => {
  const root = await temp(t);
  await put(root, 'backend/package.json', JSON.stringify({ packageManager: 'bun@1.2.0', scripts: { dev: 'bun index.ts', deploy: 'touch NEVER' } }));
  await put(root, 'frontend/package.json', JSON.stringify({ packageManager: 'pnpm@10.0.0', scripts: { test: 'vitest run', build: 'vite build' } }));
  await put(root, 'AGENTS.md', 'Keep existing human rules.\n');
  const r = await init(root);
  assert.equal(r.summary.layout, 'compact'); assert.equal(r.summary.preset, 'minimal'); assert.deepEqual(r.summary.tools, []);
  assert.equal(r.changed.length, 4);
  const text = await read(root, 'AGENTS.md');
  assert.ok(text.startsWith('Keep existing human rules.'));
  assert.match(text, /backend.*bun run dev/); assert.match(text, /frontend.*pnpm run test/);
  assert.doesNotMatch(text, /run deploy/);
  assert.ok(r.summary.cautions.length >= 2);
  await assert.rejects(access(path.join(root, '.agent-context')));
  await assert.rejects(access(path.join(root, 'backend/NEVER')));
  assert.deepEqual((await initialize({root,operation:'sync'})).changed, []);
});

test('source-backed facts become stale, cannot be applied after evidence changes, and never enter preferences', async t => {
  const root = await temp(t);
  await put(root, 'src/contracts.ts', 'export type User = {id: string}');
  const projectFacts = [{ text: '修改用户结构时同步调用方类型。', sources: ['src/contracts.ts'] }];
  const p = await planProject({root,request:'Configure',projectFacts});
  await put(root, 'src/contracts.ts', 'export type User = {id: number}');
  await assert.rejects(applyPlan(p), /changed after planning/);
  await init(root, {projectFacts});
  assert.match(await read(root,'AGENTS.md'), /项目关系与改动提醒/);
  assert.doesNotMatch(JSON.stringify(await exportPreferences(root)), /contracts.ts|用户结构/);
  await put(root, 'src/contracts.ts', 'export type Account = {}');
  const preview = await planProject({root,operation:'sync'});
  assert.equal(preview.summary.staleNotes,1);
  await applyPlan(preview);
  assert.equal((await doctor(root)).status, "needs-review");
  const text = await read(root,'AGENTS.md');
  assert.doesNotMatch(text, /### 项目关系与改动提醒/); assert.match(text, /来源已变/);
  const refreshed = await initialize({root,operation:'sync',projectFacts:[{text:'账户结构在 contracts.ts。',sources:['src/contracts.ts']}]});
  assert.equal(refreshed.summary.staleNotes,0);
  assert.equal((await doctor(root)).status,'checks-passed');
  await assert.rejects(init(root,{projectFacts:[{text:'bad',sources:['.env']}]}), /secrets/);
  await assert.rejects(init(root,{projectFacts:[{text:'bad',sources:['missing.ts']}]}), /does not exist/);
});

test('legacy layout is retained; explicit compact migration deletes only unmodified owned files', async t => {
  const root = await temp(t);
  await init(root,{layout:'expanded',preset:'peter'});
  // Simulate v0.2 config without the new layout/facts fields.
  const config = JSON.parse(await read(root,'.ai-init/config.json')); delete config.layout;delete config.projectFacts;
  await put(root,'.ai-init/config.json',JSON.stringify(config));
  await initialize({root,operation:'sync'});
  assert.equal(JSON.parse(await read(root,'.ai-init/config.json')).layout,'expanded');
  await put(root,'.agent-context/my-notes.md','Keep me');
  const manual = await read(root,'.agent-context/workflow.md');
  await put(root,'.agent-context/workflow.md',manual+'\nEdited');
  assert.equal((await initialize({root,operation:'sync',layout:'compact'})).status,'conflict');
  await put(root,'.agent-context/workflow.md',manual);
  await initialize({root,operation:'sync',layout:'compact'});
  await assert.rejects(access(path.join(root,'.agent-context/workflow.md')));
  assert.equal(await read(root,'.agent-context/my-notes.md'),'Keep me');
  assert.deepEqual(JSON.parse(await read(root,'.ai-init/config.json')).preset.tools,['codegraph']);
  assert.deepEqual((await initialize({root,operation:'sync'})).changed,[]);
});

test('inspect provides bounded source excerpts and raw script definitions, but no execution claims', async t => {
  const root = await temp(t);
  await put(root,'README.md','# Project\n'.repeat(100));
  await put(root,'package.json',JSON.stringify({packageManager:'npm@10',scripts:{test:'echo not-a-test'}}));
  const scan = await inspectProject(root);
  assert.equal(scan.sources[0].truncated,true);
  assert.equal(scan.briefing.commands[0].definition,'echo not-a-test');
  assert.equal(scan.briefing.commands[0].verified,false);
  const p = await planProject({root,request:'configure'});
  await put(root,'README.md','# Updated');
  await assert.rejects(applyPlan(p), /changed after planning/);
});
