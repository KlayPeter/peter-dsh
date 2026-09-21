import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Used only for PNGs produced by our worker or Chromium, not arbitrary uploads.
export function pngAsset(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid generated PNG.');
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (!width || !height) throw new Error('Invalid generated PNG dimensions.');
  return { buffer, width, height };
}

export function normalizeImage(raw, { signal } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [fileURLToPath(new URL('./image-worker.js', import.meta.url))], {
      encoding: 'buffer', timeout: 30000, maxBuffer: 170 * 1024 * 1024,
      killSignal: 'SIGKILL', signal, windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) return reject(new Error(`Image conversion failed: ${stderr.toString().trim() || error.message}`, { cause: error }));
      try { resolve(pngAsset(stdout)); } catch (error) { reject(error); }
    });
    // A worker that fails early may close stdin; execFile reports its exit error.
    child.stdin.on('error', () => {});
    child.stdin.end(raw);
  });
}
