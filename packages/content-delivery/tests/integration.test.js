import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { exportDocument } from '../src/index.js';
import { openBrowser } from '../src/browser.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('five document profiles export to three real formats', { timeout: 180000 }, async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'peter-integration-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const browser = await openBrowser();
  t.after(() => browser.close());
  for (const type of ['prd', 'explainer', 'design', 'blog', 'research']) {
    const result = await exportDocument({ input: path.join(root, 'examples', `${type}.md`), out: path.join(temp, type), formats: ['html', 'pdf', 'docx'], type });
    assert.equal(result.files.length, 3);
    const pdf = await readFile(result.files[1]);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    const xml = execFileSync('unzip', ['-p', result.files[2], 'word/document.xml'], { encoding: 'utf8' });
    assert.ok(xml.includes(result.manifest.title));
    const context = await browser.newContext();
    const page = await context.newPage();
    const requests = [];
    await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    await page.setContent(await readFile(result.files[0], 'utf8'));
    assert.equal(await page.locator('h1').innerText(), result.manifest.title);
    assert.equal(await page.locator('script').count(), 0);
    assert.deepEqual(requests, []);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (['design', 'explainer'].includes(type)) {
      assert.equal(await page.locator('figure img').count(), 1);
      assert.ok(await page.locator('figure img').evaluate(img => img.complete && img.naturalWidth > 0));
      assert.match(execFileSync('unzip', ['-Z1', result.files[2]], { encoding: 'utf8' }), /word\/media\/.*\.png/);
    }
    await context.close();
  }
});

test('broken diagrams fail explicitly without partial output', { timeout: 45000 }, async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'peter-broken-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const input = path.join(temp, 'broken.md');
  await writeFile(input, '# Broken\n\n```mermaid\nnot-a-diagram !!!\n```');
  const out = path.join(temp, 'out');
  await assert.rejects(exportDocument({ input, out }), /Mermaid rendering failed/);
  await assert.rejects(access(out));
});
