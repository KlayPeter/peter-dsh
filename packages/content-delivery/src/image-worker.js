// Only this short-lived process loads sharp/libvips, never the Agent host.
import sharp from 'sharp';

try {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 10 * 1024 * 1024) throw new Error('Image exceeds 10 MiB.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  const image = sharp(raw, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!['png', 'jpeg', 'webp'].includes(metadata.format)) throw new Error('Unsupported image format. Use PNG, JPEG or WebP.');
  const png = await image.rotate().png().toBuffer();
  process.stdout.write(png);
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
