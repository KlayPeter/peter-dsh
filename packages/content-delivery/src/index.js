import { readFile, writeFile, mkdir, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseMarkdown, checkMarkdown } from './markdown.js';
import { validateProfile } from './guides.js';
import { renderHtml } from './html.js';
import { prepareAssets } from './assets.js';
import { openBrowser, offlinePage } from './browser.js';
import { renderDocx } from './word.js';

export { getGuide, profiles, modes, skillRoot } from './guides.js';
export { checkMarkdown } from './markdown.js';

export async function exportDocument({ input, out, formats = ['html'], type = 'explainer', allowDraft = false, toc = true, signal } = {}) {
  signal?.throwIfAborted();
  validateProfile(type);
  if (!input || !out) throw new Error('input and out are required.');
  if (!Array.isArray(formats) || !formats.length || formats.some(f => !['html', 'pdf', 'docx'].includes(f))) throw new Error('Formats must be html, pdf or docx.');
  formats = [...new Set(formats)];
  const inputPath = await realpath(input);
  const source = await readFile(inputPath, 'utf8');
  const document = parseMarkdown(source);
  const checks = checkMarkdown(source, { type });
  if (checks.status === 'blocked' && !allowDraft) throw new Error(`Document checks blocked export: ${checks.findings.filter(f => f.severity === 'error').map(f => `line ${f.line}: ${f.message}`).join('; ')} Use --allow-draft only for a knowingly unfinished draft.`);
  const output = path.resolve(out);
  await mkdir(path.dirname(output), { recursive: true });
  try { await mkdir(output); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Output already exists: ${output}. Choose a new directory; existing deliveries are never overwritten.`);
    throw error;
  }
  let browser;
  const onAbort = () => { if (browser) void browser.close().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const needsBrowser = formats.includes('pdf') || document.tokens.some(t => t.type === 'fence' && t.info.trim() === 'mermaid');
    if (needsBrowser) browser = await openBrowser();
    signal?.throwIfAborted();
    const assetDir = path.join(output, 'assets');
    await mkdir(assetDir);
    const assets = await prepareAssets(document.tokens, { baseDir: path.dirname(inputPath), assetDir, browser });
    const files = [];
    const html = renderHtml(document, assets, { toc });
    if (formats.includes('html')) { await writeFile(path.join(output, 'document.html'), html); files.push('document.html'); }
    if (formats.includes('pdf')) {
      const page = await offlinePage(browser, { javaScriptEnabled: false });
      try {
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
        await page.pdf({ path: path.join(output, 'document.pdf'), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font:9px Arial;width:100%;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>', timeout: 30000 });
      } finally { await page.context().close(); }
      files.push('document.pdf');
    }
    if (formats.includes('docx')) { await writeFile(path.join(output, 'document.docx'), await renderDocx(document, assets)); files.push('document.docx'); }
    signal?.throwIfAborted();
    await writeFile(path.join(output, 'source.md'), source);
    await writeFile(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2) + '\n');
    const hash = buffer => createHash('sha256').update(buffer).digest('hex');
    const artifacts = await Promise.all(files.map(async name => ({ name, sha256: hash(await readFile(path.join(output, name))) })));
    const manifest = { schemaVersion: 1, generator: '@klaypeter/content-delivery@0.1.0', title: document.title, type, createdAt: new Date().toISOString(), sourceSha256: hash(source), formats, draft: checks.status === 'blocked', checks: checks.status, assets: assets.size, artifacts };
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return { output, files: files.map(name => path.join(output, name)), checks, manifest };
  } catch (error) { await rm(output, { recursive: true, force: true }); throw error; }
  finally { signal?.removeEventListener('abort', onAbort); if (browser) await browser.close(); }
}
