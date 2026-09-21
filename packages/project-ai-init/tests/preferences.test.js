import test from "node:test";
import assert from "node:assert/strict";
import {
  realpath,
  mkdtemp,
  writeFile,
  readFile,
  mkdir,
  rm,
  access,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initialize, loadPreset } from "../src/index.js";
import { inspectReference, exportPreferences } from "../src/preferences.js";
import { toolingPlan, setupCodegraph } from "../src/tooling.js";
async function temp(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "peter-preferences-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
test("reference is read-only evidence; portable preset excludes project-specific rules", async (t) => {
  const ref = await temp(t),
    root = await temp(t),
    other = await temp(t);
  await writeFile(
    path.join(ref, "AGENTS.md"),
    "Use feature docs. Never copy this repository business requirement.",
  );
  const evidence = await inspectReference(ref);
  assert.equal(evidence.sources[0].path, "AGENTS.md");
  await assert.rejects(access(path.join(ref, ".ai-init")));
  const preset = {
    id: "team",
    rules: ["Sync feature docs"],
    featureDocs: true,
    tools: ["codegraph"],
  };
  await initialize({
    root,
    request: "Configure",
    starter: "none",
    preset,
    projectRules: ["This project uses npm"],
  });
  const portable = await exportPreferences(root);
  assert.equal(JSON.stringify(portable).includes("npm"), false);
  await initialize({
    root: other,
    request: "Configure",
    starter: "none",
    preset: portable,
    projectRules: ["This project uses Bun"],
  });
  await initialize({
    root,
    operation: "sync",
    preset: { ...portable, rules: [...portable.rules, "Use Chinese"] },
  });
  const config = JSON.parse(
    await readFile(path.join(root, ".ai-init/config.json")),
  );
  assert.deepEqual(config.projectRules, ["This project uses npm"]);
  assert.ok(
    (
      await readFile(path.join(root, "AGENTS.md"), "utf8")
    ).includes("Use Chinese"),
  );
  assert.deepEqual((await exportPreferences(other)).rules, [
    "Sync feature docs",
  ]);
});
test("reference truncation is explicit and tool names are validated", async (t) => {
  const root = await temp(t);
  await writeFile(path.join(root, "README.md"), "x".repeat(15000));
  assert.equal((await inspectReference(root)).sources[0].truncated, true);
  await assert.rejects(
    loadPreset({ id: "bad", rules: [], tools: ["codegraph;curl bad"] }),
  );
});
test("tool discovery includes rules and custom tools without executing them", async (t) => {
  const root = await temp(t);
  await initialize({
    root,
    request: "Configure",
    starter: "none",
    preset: { id: "team", rules: ["Use CodeGraph"], tools: ["custom-mcp"] },
  });
  const p = await toolingPlan(root);
  assert.ok(p.tools.includes("codegraph"));
  assert.equal(
    p.recipes.find((x) => x.id === "custom-mcp").status,
    "host-install-required",
  );
  let called = false;
  const preview = await setupCodegraph({ root, dryRun: true }, async () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(preview.status, "ready");
  await assert.rejects(access(path.join(root, ".ai-init/runtime")));
});
test("installer executes fixed arguments, cleans lock on failure and preserves existing overlays", async (t) => {
  const root = await temp(t);
  const calls = [];
  const run = async (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return { stdout: "ok" };
  };
  const result = await setupCodegraph({ root }, run);
  assert.equal(result.status, "installed-needs-connection");
  assert.equal(calls.length, 3);
  assert.equal(calls[0].args.at(-1), "@colbymchenry/codegraph@1.6.0");
  const patch = JSON.parse(await readFile(result.overlay, "utf8"));
  assert.equal(patch[0].insert[0].config.cwd, await realpath(root));
  await assert.rejects(access(path.join(root, ".ai-init/tooling.lock")));
  await writeFile(result.overlay, "my existing config");
  await assert.rejects(setupCodegraph({ root }, run), /differs/);
  assert.equal(calls.length, 3);
  const failed = await temp(t);
  await assert.rejects(
    setupCodegraph({ root: failed }, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  await assert.rejects(access(path.join(failed, ".ai-init/tooling.lock")));
  await assert.rejects(
    access(path.join(failed, ".ai-init/codegraph.dsh.json")),
  );
});
