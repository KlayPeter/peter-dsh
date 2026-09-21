import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
async function temp(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "peter-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
test("CLI needs-input has distinct exit code; dry-run never applies", async (t) => {
  const root = await temp(t);
  let r = run(["init", "--root", root, "--request", "搭建应用"]);
  assert.equal(r.status, 2);
  assert.equal(JSON.parse(r.stdout).status, "needs-input");
  r = run(["init", "--root", root, "--request", "Node CLI", "--dry-run"]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).status, "ready");
  await assert.rejects(readFile(path.join(root, "AGENTS.md")));
});
test("CLI accepts custom preset and shows read-only guide", async (t) => {
  const root = await temp(t);
  const custom = path.join(root, "preferences.json");
  await writeFile(
    custom,
    JSON.stringify({
      id: "test-team",
      rules: ["Prefer explicit interfaces."],
      featureDocs: false,
    }),
  );
  const r = run([
    "init",
    "--root",
    root,
    "--request",
    "配置现有项目",
    "--preset-file",
    custom,
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    await readFile(path.join(root, "AGENTS.md"), "utf8"),
    /Prefer explicit interfaces/,
  );
  const guide = run(["guide", "--mode", "empty"]);
  assert.equal(guide.status, 0);
  assert.match(guide.stdout, /python-cli/);
});
test("Skill install is self-contained and refuses overwrite", async (t) => {
  const root = await temp(t);
  const r = run(["install-skill", "--target", root]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(
    await readFile(
      path.join(root, "project-ai-init/upstream/provenance.json"),
      "utf8",
    ),
  );
  const original = await readFile(
    path.join(root, "project-ai-init/SKILL.md"),
    "utf8",
  );
  assert.equal(run(["install-skill", "--target", root]).status, 1);
  assert.equal(
    await readFile(path.join(root, "project-ai-init/SKILL.md"), "utf8"),
    original,
  );
});

test('CLI accepts compact facts and reports changed evidence as needs-review', async t => {
  const root = await temp(t), data = await temp(t);
  await writeFile(path.join(root,'README.md'),'# Actual project');
  const facts = path.join(data,'facts.json');
  await writeFile(facts,JSON.stringify([{text:'项目介绍在 README。',sources:['README.md']}]));
  const r = run(['init','--root',root,'--request','Configure','--layout','compact','--facts-file',facts]);
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(r.stdout).summary.projectNotes,1);
  await writeFile(path.join(root,'README.md'),'# Changed project');
  assert.equal(run(['doctor','--root',root]).status,2);
});
