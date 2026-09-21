import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  mkdir,
  rm,
  symlink,
  access,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  inspectProject,
  initialize,
  planProject,
  applyPlan,
  doctor,
} from "../src/index.js";
async function temp(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "peter-ai-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function put(root, file, text) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}
const read = (root, file) => readFile(path.join(root, file), "utf8");
const init = (root, args = {}) =>
  initialize({
    root,
    request: "配置当前项目的 AI 工作规则",
    starter: "none",
    layout: "expanded",
    ...args,
  });
test("ambiguous empty request produces questions and no files", async (t) => {
  const root = await temp(t);
  const p = await initialize({ root, request: "做一个管理后台" });
  assert.equal(p.status, "needs-input");
  assert.ok(p.questions.length);
  await assert.rejects(access(path.join(root, ".ai-init")));
  const negative = await planProject({
    root,
    request: "不要 Python 命令行，改做网页",
  });
  assert.equal(negative.status, "needs-input");
});
test("empty Node CLI is runnable; refresh discovers real scripts and is idempotent", async (t) => {
  const root = await temp(t);
  const r = await initialize({
    root,
    request: "做一个 Node.js CLI",
    targets: ["dsh", "codex", "claude"],
  });
  assert.equal(r.status, "applied");
  assert.match(
    execFileSync(process.execPath, ["src/cli.js", "--help"], {
      cwd: root,
      encoding: "utf8",
    }),
    /Usage:/,
  );
  execFileSync(process.execPath, ["--test"], { cwd: root, stdio: "pipe" });
  const s = await initialize({ root, operation: "sync" });
  assert.equal(s.status, "applied");
  assert.match(await read(root, "AGENTS.md"), /npm run test/);
  const again = await initialize({ root, operation: "sync" });
  assert.deepEqual(again.changed, []);
  assert.equal((await doctor(root)).status, "checks-passed");
  assert.equal(
    (await read(root, "AGENTS.md")).match(/<!-- peter-ai:begin -->/g).length,
    1,
  );
  assert.match(await read(root, "CLAUDE.md"), /@AGENTS.md/);
});
test("Python starter runs its real CLI tests", async (t) => {
  const root = await temp(t);
  await initialize({ root, request: "Python 命令行工具" });
  execFileSync("python3", ["-m", "unittest", "discover", "-s", "tests"], {
    cwd: root,
    stdio: "pipe",
  });
  assert.match(
    execFileSync("python3", ["main.py", "--help"], {
      cwd: root,
      encoding: "utf8",
    }),
    /usage:/,
  );
});
test("static web and docs starters create entry points without pretending business is complete", async (t) => {
  for (const starter of ["static-web", "docs"]) {
    const root = await temp(t);
    await initialize({ root, request: "新项目", starter });
    assert.ok(
      await read(root, starter === "docs" ? "docs/index.md" : "index.html"),
    );
    assert.match(await read(root, "README.md"), /业务能力尚待实现/);
  }
});
test("existing monorepo keeps stack and human rules; does not execute setup scripts", async (t) => {
  const root = await temp(t);
  await put(
    root,
    "backend/package.json",
    JSON.stringify({
      scripts: { dev: "bun run src/index.ts", setup: "touch MUST_NOT_EXIST" },
    }),
  );
  await put(root, "backend/bun.lock", "{}");
  await put(
    root,
    "frontend/package.json",
    JSON.stringify({
      scripts: { build: "vite build" },
      dependencies: { react: "*" },
    }),
  );
  await put(root, "frontend/pnpm-lock.yaml", "lockfileVersion: 9");
  await put(root, "AGENTS.md", "# Existing\n\nNever deploy automatically.\n");
  await put(root, "CLAUDE.md", "# Claude additions\n");
  const scan = await inspectProject(root);
  assert.equal(scan.mode, "existing");
  assert.deepEqual(
    scan.packages.map((p) => p.manager),
    ["bun", "pnpm"],
  );
  await init(root, { targets: ["dsh", "claude"] });
  assert.ok(
    (await read(root, "AGENTS.md")).startsWith(
      "# Existing\n\nNever deploy automatically.\n",
    ),
  );
  assert.ok((await read(root, "CLAUDE.md")).startsWith("# Claude additions\n"));
  await assert.rejects(access(path.join(root, "MUST_NOT_EXIST")));
  await assert.rejects(
    initialize({ root, request: "replace", starter: "node-cli" }),
    /Changing starters/,
  );
});
test("README-only repository counts as existing and cannot receive a starter", async (t) => {
  const root = await temp(t);
  await put(root, "README.md", "# Plans");
  assert.equal((await inspectProject(root)).mode, "existing");
  await assert.rejects(
    init(root, { starter: "python-cli" }),
    /Existing content/,
  );
  assert.equal(await read(root, "README.md"), "# Plans");
});
test("presets can change; manual content outside managed region survives", async (t) => {
  const root = await temp(t);
  await init(root);
  await put(
    root,
    "AGENTS.md",
    (await read(root, "AGENTS.md")) + "\nUser-owned additions.\n",
  );
  const config = JSON.parse(await read(root, ".ai-init/config.json"));
  config.preset.rules.push("Prefer small public APIs.");
  await put(root, ".ai-init/config.json", JSON.stringify(config));
  await initialize({ root, operation: "sync" });
  assert.match(await read(root, "AGENTS.md"), /User-owned additions/);
  assert.match(
    await read(root, ".agent-context/workflow.md"),
    /Prefer small public APIs/,
  );
});
test("modified generated content blocks entire sync; doctor reports it", async (t) => {
  const root = await temp(t);
  await init(root);
  const previous = await read(root, "AGENTS.md");
  await put(root, ".agent-context/workflow.md", "hand edited");
  const r = await initialize({ root, operation: "sync" });
  assert.equal(r.status, "conflict");
  assert.equal(await read(root, "AGENTS.md"), previous);
  assert.equal(await read(root, ".agent-context/workflow.md"), "hand edited");
  assert.equal((await doctor(root)).status, "needs-attention");
});
test("unowned file collision and malformed markers are not overwritten", async (t) => {
  const root = await temp(t);
  await put(root, ".agent-context/workflow.md", "mine");
  const r = await init(root);
  assert.equal(r.status, "conflict");
  assert.equal(await read(root, ".agent-context/workflow.md"), "mine");
  await assert.rejects(access(path.join(root, "AGENTS.md")));
  await put(root, "AGENTS.md", "<!-- peter-ai:begin -->\nno end");
  await assert.rejects(init(root), /Malformed managed markers/);
});
test("stale plan refuses a source edit and a target edit before writing", async (t) => {
  const root = await temp(t);
  await put(root, "package.json", '{"scripts":{"test":"node --test"}}');
  const p = await planProject({ root, request: "Configure" });
  await put(root, "package.json", '{"scripts":{"lint":"eslint"}}');
  await assert.rejects(applyPlan(p), /changed after planning/);
  await assert.rejects(access(path.join(root, "AGENTS.md")));
  await init(root);
  const next = await planProject({ root, operation: "sync" });
  await put(root, ".agent-context/workflow.md", "new edit");
  await assert.rejects(applyPlan(next), /changed after planning/);
});
test("symlink output and Git internals in state are refused", async (t) => {
  const root = await temp(t),
    outside = await temp(t);
  await symlink(outside, path.join(root, ".agent-context"));
  await assert.rejects(init(root), /symlink/);
  await assert.rejects(access(path.join(outside, "workflow.md")));
  const second = await temp(t);
  await init(second);
  const state = JSON.parse(await read(second, ".ai-init/state.json"));
  state.entries[".git/config"] = { kind: "managed", hash: "a".repeat(64) };
  await put(second, ".ai-init/state.json", JSON.stringify(state));
  await assert.rejects(
    initialize({ root: second, operation: "sync" }),
    /Git internals/,
  );
});
test("failed apply rolls back its writes; lock rejects parallel writes", async (t) => {
  const root = await temp(t);
  await put(root, "AGENTS.md", "human");
  const plan = await planProject({
    root,
    request: "Only configure",
    starter: "none",
  });
  let n = 0;
  await assert.rejects(
    applyPlan(plan, {
      signal: {
        throwIfAborted() {
          if (++n === 4) throw new Error("simulated cancellation");
        },
      },
    }),
    /simulated cancellation/,
  );
  assert.equal(await read(root, "AGENTS.md"), "human");
  await assert.rejects(access(path.join(root, ".agent-context")));
  await assert.rejects(access(path.join(root, ".ai-init")));
  await put(root, ".ai-init/lock", "active");
  await assert.rejects(applyPlan(plan), /locked/);
  assert.equal(await read(root, "AGENTS.md"), "human");
});
test("business scaffold files remain user-owned after creation", async (t) => {
  const root = await temp(t);
  await initialize({ root, request: "Node CLI" });
  await put(root, "src/cli.js", "// user implementation\n");
  await initialize({ root, operation: "sync" });
  assert.equal(await read(root, "src/cli.js"), "// user implementation\n");
});
test("unknown package manager stays unknown; malformed manifest fails without writes", async (t) => {
  const root = await temp(t);
  await put(root, "package.json", '{"scripts":{"test":"vitest"}}');
  let s = await inspectProject(root);
  assert.equal(s.packages[0].manager, null);
  assert.deepEqual(s.packages[0].commands, []);
  await put(root, "package.json", "not json");
  await assert.rejects(init(root), /Invalid package.json/);
  await assert.rejects(access(path.join(root, "AGENTS.md")));
});
test("removed target only removes managed block and preserves user text", async (t) => {
  const root = await temp(t);
  await put(root, "CLAUDE.md", "my claude notes\n");
  await init(root, { targets: ["claude"] });
  await initialize({
    root,
    operation: "sync",
    targets: ["dsh"],
    preset: "minimal",
  });
  assert.match(await read(root, "CLAUDE.md"), /my claude notes/);
  assert.doesNotMatch(await read(root, "CLAUDE.md"), /peter-ai:begin/);
  await assert.rejects(
    access(path.join(root, ".agent-context/feature-docs.md")),
  );
});
test("vendored references carry licenses and match pinned hashes", async () => {
  const base = new URL("../vendor/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("provenance.json", base), "utf8"),
  );
  for (const source of manifest.sources) {
    assert.ok(source.files.some((f) => f.path.endsWith("/LICENSE")));
    for (const file of source.files) {
      assert.equal(
        createHash("sha256")
          .update(await readFile(new URL(file.path, base)))
          .digest("hex"),
        file.sha256,
      );
    }
  }
});

test("workspace packages inherit nearest manager and stop at conflicts", async (t) => {
  const root = await temp(t);
  await put(
    root,
    "package.json",
    JSON.stringify({ packageManager: "pnpm@10.0.0" }),
  );
  await put(
    root,
    "packages/a/package.json",
    JSON.stringify({ scripts: { test: "node --test", bad: 42 } }),
  );
  await put(root, "packages/b/package.json", "{}");
  await put(root, "packages/b/bun.lock", "{}");
  await put(root, "packages/c/package.json", "{}");
  await put(root, "packages/c/bun.lock", "{}");
  await put(root, "packages/c/package-lock.json", "{}");
  const result = await inspectProject(root);
  const byDir = Object.fromEntries(
    result.packages.map((p) => [p.directory, p]),
  );
  assert.equal(byDir["packages/a"].manager, "pnpm");
  assert.deepEqual(byDir["packages/a"].scripts, ["test"]);
  assert.equal(byDir["packages/b"].manager, "bun");
  assert.equal(byDir["packages/c"].manager, null);
});
