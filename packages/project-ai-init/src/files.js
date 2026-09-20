import {
  lstat,
  readFile,
  readdir,
  mkdir,
  writeFile,
  rename,
  unlink,
  rmdir,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
export const hash = (data) => createHash("sha256").update(data).digest("hex");
export const json = (data) => JSON.stringify(data, null, 2) + "\n";
export const exists = async (file) => {
  try {
    return await lstat(file);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
};
export async function rootPath(root) {
  const result = await realpath(root || process.cwd());
  if (!(await lstat(result)).isDirectory())
    throw new Error("Project root must be an existing directory.");
  return result;
}
export async function safePath(root, relative) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error(`Invalid project path: ${relative}`);
  const parts = relative.split("/");
  if (parts.includes(".git"))
    throw new Error("Refusing access to Git internals.");
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const info = await exists(current);
    if (info?.isSymbolicLink())
      throw new Error(`Refusing symlink: ${relative}`);
    if (info && i < parts.length - 1 && !info.isDirectory())
      throw new Error(`Parent is not a directory: ${relative}`);
    if (info && i === parts.length - 1 && !info.isFile())
      throw new Error(`Not a regular file: ${relative}`);
  }
  return current;
}
export async function readText(root, relative) {
  const file = await safePath(root, relative);
  const info = await exists(file);
  if (!info) return null;
  if (info.size > 512 * 1024)
    throw new Error(`Configuration file too large: ${relative}`);
  return readFile(file, "utf8");
}
export async function atomicWrite(root, relative, content, createdDirs = []) {
  const file = await safePath(root, relative);
  const parent = path.dirname(file);
  const missing = [];
  for (let p = parent; p !== root && !(await exists(p)); p = path.dirname(p))
    missing.push(p);
  for (const p of missing.reverse()) {
    await mkdir(p);
    createdDirs.push(p);
  }
  await safePath(root, relative);
  const temp = path.join(parent, `.peter-ai-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, content, {
      flag: "wx",
      mode: (await exists(file))?.mode & 0o777 || 0o644,
    });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
export async function removeEmpty(dirs) {
  for (const dir of [...dirs].reverse())
    await rmdir(dir).catch((e) => {
      if (!["ENOENT", "ENOTEMPTY"].includes(e.code)) throw e;
    });
}
export { readFile, readdir, lstat, mkdir, writeFile, unlink, path };
