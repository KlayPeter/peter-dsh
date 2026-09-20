import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { exportDocument, checkMarkdown, getGuide, profiles } from '../src/index.js';
import { loadLocalImage } from '../src/assets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function workspace(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'peter-delivery-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('profile routing loads one type and format mode excludes rewriting', async () => {
  for (const type of Object.keys(profiles)) {
    const guide = await getGuide({ type, mode: 'create' });
    assert.ok(guide.includes(`<!-- references/${type}.md -->`));
    for (const other of Object.keys(profiles).filter(x => x !== type)) assert.ok(!guide.includes(`<!-- references/${other}.md -->`));
  }
  const guide = await getGuide({ type: 'prd', mode: 'format' });
  assert.ok(!guide.includes('<!-- references/shared-writing.md -->'));
  await assert.rejects(getGuide({ type: '../secrets' }), /Unknown document type/);
});

test('unfinished prose blocks, code examples do not, warnings stay distinct', () => {
  assert.equal(checkMarkdown('# 标题\n\nTODO 填正文').status, 'blocked');
  assert.equal(checkMarkdown('# 标题\n\n```js\n// TODO example\n```').status, 'checks-passed');
  assert.equal(checkMarkdown('# 标题\n\n### 跳级').status, 'needs-review');
  assert.equal(checkMarkdown('# 标题\n\n![图](https://example.com/a.png)').status, 'blocked');
});

test('HTML is offline and text stays literal, source and hashes are preserved', async t => {
  const dir = await workspace(t);
  const source = '# 中文标题\n\n只有在输入有效时才可能完成。\n\n<script>alert(1)</script>\n\n## 下一节\n\n[文档](https://example.com)';
  const input = path.join(dir, 'input.md');
  await writeFile(input, source);
  const result = await exportDocument({ input, out: path.join(dir, 'delivery') });
  const html = await readFile(result.files[0], 'utf8');
  assert.ok(html.includes('只有在输入有效时才可能完成。'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!/<script[\s>]/i.test(html));
  assert.ok(html.includes("default-src 'none'"));
  assert.equal(await readFile(path.join(result.output, 'source.md'), 'utf8'), source);
  assert.equal(result.manifest.sourceSha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(result.manifest.artifacts[0].sha256, createHash('sha256').update(html).digest('hex'));
});

test('existing delivery and source are never overwritten', async t => {
  const dir = await workspace(t);
  const input = path.join(dir, 'source.md');
  const out = path.join(dir, 'existing');
  await writeFile(input, '# Original');
  await mkdir(out);
  await writeFile(path.join(out, 'keep.txt'), 'keep');
  await assert.rejects(exportDocument({ input, out }), /already exists/);
  assert.equal(await readFile(path.join(out, 'keep.txt'), 'utf8'), 'keep');
  assert.equal(await readFile(input, 'utf8'), '# Original');
});

test('failed resource loading cleans only the newly created delivery', async t => {
  const dir = await workspace(t);
  const input = path.join(dir, 'source.md');
  const out = path.join(dir, 'failed');
  await writeFile(input, '# Missing\n\n![图](absent.png)');
  await assert.rejects(exportDocument({ input, out }));
  await assert.rejects(access(out));
  assert.ok(await readFile(input, 'utf8'));
});

test('local images embed, traversal and symlink escapes fail', async t => {
  const dir = await workspace(t);
  const inside = path.join(dir, 'inside');
  await mkdir(inside);
  const png = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#17615f' } }).png().toBuffer();
  await writeFile(path.join(dir, 'outside.png'), png);
  await writeFile(path.join(inside, 'picture.png'), png);
  await symlink(path.join(dir, 'outside.png'), path.join(inside, 'escape.png'));
  await assert.rejects(loadLocalImage('../outside.png', inside), /escapes/);
  await assert.rejects(loadLocalImage('escape.png', inside), /escapes/);
  await assert.rejects(loadLocalImage('https://example.com/image.png', inside), /relative local/);
  const input = path.join(inside, 'input.md');
  await writeFile(input, '# 图片\n\n![绿色示意](picture.png)');
  const result = await exportDocument({ input, out: path.join(dir, 'delivery'), formats: ['html', 'docx'] });
  assert.match(await readFile(result.files[0], 'utf8'), /data:image\/png;base64/);
  const names = execFileSync('unzip', ['-Z1', result.files[1]], { encoding: 'utf8' });
  assert.match(names, /word\/media\/.*\.png/);
});

test('Word keeps native headings, numbering, tables and external links', async t => {
  const dir = await workspace(t);
  const input = path.join(dir, 'input.md');
  await writeFile(input, '# 标题\n\n## 章节\n\n3. 第三项\n4. 第四项\n\n| 字段 | 说明 |\n| --- | --- |\n| input | 源文件 |\n\n[来源](https://example.com)\n\n**重要条件**：可能失败。');
  const result = await exportDocument({ input, out: path.join(dir, 'delivery'), formats: ['docx'] });
  const xml = execFileSync('unzip', ['-p', result.files[0], 'word/document.xml'], { encoding: 'utf8' });
  assert.match(xml, /w:pStyle w:val="Title"/);
  assert.match(xml, /w:pStyle w:val="Heading2"/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:numPr>/);
  assert.match(xml, /w:hyperlink/);
  assert.match(xml, /可能失败/);
  const numbering = execFileSync('unzip', ['-p', result.files[0], 'word/numbering.xml'], { encoding: 'utf8' });
  assert.match(numbering, /w:start w:val="3"/);
});

test('draft export is explicit and recorded; invalid arguments fail', async t => {
  const dir = await workspace(t);
  const input = path.join(dir, 'input.md');
  await writeFile(input, '# 草稿\n\nTBD');
  await assert.rejects(exportDocument({ input, out: path.join(dir, 'blocked') }), /blocked/);
  await assert.rejects(access(path.join(dir, 'blocked')));
  const result = await exportDocument({ input, out: path.join(dir, 'draft'), allowDraft: true });
  assert.equal(result.manifest.draft, true);
  await assert.rejects(exportDocument({ input, out: path.join(dir, 'invalid'), formats: ['exe'] }), /Formats/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(exportDocument({ input, out: path.join(dir, 'cancelled'), signal: controller.signal }), /abort/i);
});

test('vendored snapshots match their provenance hashes and include licenses', async () => {
  const vendor = path.join(root, 'vendor');
  const manifest = JSON.parse(await readFile(path.join(vendor, 'provenance.json'), 'utf8'));
  assert.equal(manifest.sources.length, 4);
  for (const source of manifest.sources) {
    assert.ok(source.files.some(f => f.upstreamPath === 'LICENSE'));
    for (const file of source.files) {
      assert.equal(createHash('sha256').update(await readFile(path.join(vendor, file.path))).digest('hex'), file.sha256, file.path);
    }
  }
});

test('CLI rejects missing paths and installation does not overwrite a skill', async t => {
  const dir = await workspace(t);
  const cli = path.join(root, 'src/cli.js');
  assert.throws(() => execFileSync(process.execPath, [cli, 'export'], { stdio: 'pipe' }));
  execFileSync(process.execPath, [cli, 'install-skill', '--target', dir], { stdio: 'pipe' });
  assert.ok(await readFile(path.join(dir, 'content-delivery/upstream/provenance.json'), 'utf8'));
  assert.throws(() => execFileSync(process.execPath, [cli, 'install-skill', '--target', dir], { stdio: 'pipe' }));
});
