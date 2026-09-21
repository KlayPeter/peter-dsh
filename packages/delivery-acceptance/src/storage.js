import {
  realpath,
  lstat,
  readdir,
  readFile,
  mkdir,
  writeFile,
  link,
  unlink,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
export const hash = (data) => createHash("sha256").update(data).digest("hex");
export const json = (data) => JSON.stringify(data, null, 2) + "\n";
export const id = (value) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))
    throw new Error("Invalid identifier");
  return value;
};
export async function rootPath(root) {
  const p = await realpath(root || process.cwd());
  if (!(await lstat(p)).isDirectory())
    throw new Error("Root must be a directory");
  return p;
}
export function relative(p) {
  if (
    typeof p !== "string" ||
    !p ||
    path.isAbsolute(p) ||
    p.includes("\\") ||
    p.split("/").some((x) => !x || x === "." || x === ".." || x === ".git")
  )
    throw new Error("Invalid relative path: " + p);
  return p;
}
export async function safe(root, rel) {
  relative(rel);
  let p = root;
  for (const part of rel.split("/")) {
    p = path.join(p, part);
    try {
      if ((await lstat(p)).isSymbolicLink())
        throw new Error("Symlink refused: " + rel);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return p;
}
export async function readJson(root, rel) {
  const p = await safe(root, rel);
  if ((await lstat(p)).size > 4 * 1024 * 1024)
    throw new Error("Record exceeds size limit");
  return JSON.parse(await readFile(p, "utf8"));
}
export async function createJson(root, rel, value) {
  const p = await safe(root, rel);
  await mkdir(path.dirname(p), { recursive: true });
  await safe(root, rel);
  const temp = path.join(path.dirname(p), ".tmp-" + randomUUID());
  try {
    await writeFile(temp, json(value), { flag: "wx", mode: 0o600 });
    await link(temp, p);
  } finally {
    await unlink(temp).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
export const store = (run) => `.delivery-acceptance/${id(run)}`;
export async function createRun(root, contract) {
  const run = "run-" + randomUUID();
  await createJson(root, `${store(run)}/contract.json`, contract);
  return run;
}
const ignored = new Set([
  ".git",
  "node_modules",
  ".delivery-acceptance",
  ".venv",
  "__pycache__",
]);
export async function snapshot(root, scope) {
  const files = {};
  let bytes = 0,
    count = 0;
  async function visit(rel, depth = 0) {
    if (++count > 10000 || depth > 20)
      throw new Error("Snapshot exceeds file/depth limit; narrow scope");
    const p = await safe(root, rel);
    let stat;
    try {
      stat = await lstat(p);
    } catch (e) {
      if (e.code === "ENOENT") {
        files[rel] = null;
        return;
      }
      throw e;
    }
    if (stat.isDirectory()) {
      files[rel + "/"] = "directory";
      for (const ent of (await readdir(p)).sort()) {
        if (!ignored.has(ent)) await visit(rel + "/" + ent, depth + 1);
      }
    } else if (stat.isFile()) {
      bytes += stat.size;
      if (bytes > 64 * 1024 * 1024)
        throw new Error("Snapshot exceeds 64 MiB; narrow scope");
      files[rel] = hash(await readFile(p));
    } else throw new Error("Unsupported snapshot file: " + rel);
  }
  for (const p of [...scope].sort()) await visit(p);
  return { digest: hash(json(files)), files };
}
export async function readRecords(root, run) {
  const dir = await safe(root, `${store(run)}/evidence`);
  let names;
  try {
    names = await readdir(dir);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  if (names.length > 10000) throw new Error("Too many evidence records");
  const records = await Promise.all(
    names
      .filter((n) => !n.startsWith(".tmp-"))
      .sort()
      .map(async (name) => {
        if (!/^[a-f0-9-]+\.json$/.test(name))
          throw new Error("Unexpected evidence file");
        const record = await readJson(root, `${store(run)}/evidence/${name}`);
        if (
          record.schemaVersion !== 1 ||
          record.id + ".json" !== name ||
          !Number.isInteger(record.sequence) ||
          record.sequence < 1 ||
          !["command", "artifact", "observation"].includes(record.kind) ||
          typeof record.root !== "string" ||
          !/^[a-f0-9]{64}$/.test(record.contractHash) ||
          !/^[a-f0-9]{64}$/.test(record.snapshot)
        )
          throw new Error("Invalid evidence record: " + name);
        id(record.criterion);
        if (
          record.status === "passed" &&
          record.kind === "command" &&
          (record.exitCode !== 0 || typeof record.stdout !== "string")
        )
          throw new Error("Inconsistent command evidence: " + name);
        return record;
      }),
  );
  if (new Set(records.map((r) => r.sequence)).size !== records.length)
    throw new Error("Duplicate evidence sequence");
  return records;
}
export { readFile, lstat, mkdir, readdir, writeFile, path, randomUUID };
