import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { offlinePage } from './browser.js';

const require = createRequire(import.meta.url);

export async function loadLocalImage(src, baseDir) {
  if (!src || /^(?:[a-z][\w+.-]*:|\/\/|\/|\\)/i.test(src)) throw new Error(`Only relative local PNG/JPEG/WebP images are supported: ${src}`);
  const root = await realpath(baseDir);
  const resolved = await realpath(path.resolve(root, decodeURIComponent(src)));
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw new Error(`Image escapes the source directory: ${src}`);
  if ((await stat(resolved)).size > 10 * 1024 * 1024) throw new Error(`Image exceeds 10 MiB: ${src}`);
  const raw = await readFile(resolved);
  const metadata = await sharp(raw, { limitInputPixels: 40_000_000 }).metadata();
  if (!['png', 'jpeg', 'webp'].includes(metadata.format)) throw new Error(`Unsupported image format: ${src}. Use PNG, JPEG or WebP.`);
  const png = await sharp(raw, { limitInputPixels: 40_000_000 }).rotate().png().toBuffer();
  const info = await sharp(png).metadata();
  return { buffer: png, width: info.width, height: info.height };
}

export async function renderDiagram(code, browser) {
  if (code.length > 30000) throw new Error('Mermaid diagram exceeds 30,000 characters.');
  if (/%%\s*\{|^\s*---/m.test(code)) throw new Error('Mermaid config directives/frontmatter are not supported; use plain diagram syntax.');
  const page = await offlinePage(browser);
  const timer = setTimeout(() => { void page.context().close().catch(() => {}); }, 30000);
  try {
    await page.setContent('<!doctype html><html><head><meta charset="UTF-8"></head><body style="margin:0;background:white"><div id="diagram" style="display:inline-block;padding:20px"></div></body></html>');
    await page.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
    await page.evaluate(async source => {
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif', flowchart: { htmlLabels: false, useMaxWidth: false }, sequence: { useMaxWidth: false } });
      const { svg } = await window.mermaid.render('delivery-diagram', source);
      document.getElementById('diagram').innerHTML = svg;
      await document.fonts.ready;
    }, code);
    const size = await page.locator('#diagram').boundingBox();
    if (!size || size.width > 5000 || size.height > 5000) throw new Error('Diagram is too large; split it into smaller views.');
    const buffer = await page.locator('#diagram').screenshot({ type: 'png', animations: 'disabled' });
    const metadata = await sharp(buffer).metadata();
    return { buffer, width: metadata.width, height: metadata.height };
  } catch (error) {
    throw new Error(`Mermaid rendering failed: ${error.message}`, { cause: error });
  } finally { clearTimeout(timer); await page.context().close(); }
}

export async function prepareAssets(tokens, { baseDir, assetDir, browser }) {
  const assets = new Map();
  let count = 0;
  for (const token of tokens) {
    if (token.type === 'fence' && token.info.trim() === 'mermaid') {
      const id = `diagram-${++count}`;
      const asset = await renderDiagram(token.content, browser);
      await writeFile(path.join(assetDir, `${id}.mmd`), token.content);
      await writeFile(path.join(assetDir, `${id}.png`), asset.buffer);
      assets.set(token, { ...asset, filename: `${id}.png`, alt: '图示' });
    }
    for (const child of token.children || []) {
      if (child.type !== 'image') continue;
      const asset = await loadLocalImage(child.attrGet('src'), baseDir);
      const id = `image-${++count}`;
      await writeFile(path.join(assetDir, `${id}.png`), asset.buffer);
      assets.set(child, { ...asset, filename: `${id}.png`, alt: child.content });
    }
  }
  return assets;
}
