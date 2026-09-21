import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
if (!process.env.DSH_MODULE_ROOT)
  throw new Error("Set DSH_MODULE_ROOT to existing Harness node_modules");
const require = createRequire(
  path.join(path.resolve(process.env.DSH_MODULE_ROOT), ".smoke.cjs"),
);
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { Context } = await load("@deepseek-ai/cordis");
const { ToolRuntime } = await load("@deepseek-ai/dsh-tools");
const { SystemPrompt } = await load("@deepseek-ai/dsh-system-prompt");
const { SkillRegistry } = await load("@deepseek-ai/dsh-skill");
const plugin = await import("../packages/delivery-acceptance/src/dsh.js");
const root = await mkdtemp(path.join(os.tmpdir(), "peter-accept-dsh-"));
const ctx = new Context();
let fiber;
try {
  await writeFile(path.join(root, "README.md"), "ready");
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(ToolRuntime);
  await ctx.plugin(SkillRegistry);
  fiber = await ctx.plugin(plugin, { workspaceRoot: root });
  assert.equal(ctx.tools.schemas().length, 5);
  assert.ok(
    (await ctx.skills.list()).some((s) => s.name === "delivery-acceptance"),
  );
  let callId = 0;
  const call = async (name, args) => {
    const r = await ctx.tools.execute({
      callId: String(++callId),
      name,
      arguments: args,
      signal: new AbortController().signal,
    });
    assert.equal(r.isError, false, JSON.stringify(r));
    return JSON.parse(r.content.find((c) => c.type === "text").text);
  };
  const contract = {
    schemaVersion: 1,
    task: "README ready",
    source: "Smoke requirement",
    scope: ["README.md"],
    criteria: [
      {
        id: "DOC",
        requirement: "README contains ready",
        expected: "Nonempty file containing ready",
        origin: "user",
        required: true,
        method: "artifact",
        artifact: "README.md",
        contains: "ready",
      },
    ],
  };
  const { run } = await call("acceptance_start", {
    contractJson: JSON.stringify(contract),
  });
  assert.equal(
    (await call("acceptance_inspect", { run })).contract.task,
    "README ready",
  );
  assert.equal(
    (await call("acceptance_report", { run })).verdict,
    "incomplete-evidence",
  );
  await call("acceptance_check", { run, criterion: "DOC" });
  const result = await call("acceptance_report", { run });
  assert.equal(result.verdict, "verified-within-scope");
  assert.match(await readFile(result.files.markdown, "utf8"), /已通过/);
  await call("acceptance_observe", {
    run,
    criterion: "DOC",
    outcome: "blocked",
    note: "Cannot verify actual deployment",
  });
  assert.equal(
    (await call("acceptance_report", { run })).verdict,
    "incomplete-evidence",
  );
  await fiber.dispose();
  fiber = null;
  assert.equal(ctx.tools.schemas().length, 0);
  assert.equal((await ctx.skills.list()).length, 0);
  console.log(
    "Acceptance Harness: five tools, evidence/report, manual gaps, Skill registration and unload passed.",
  );
} finally {
  await fiber?.dispose();
  ctx.registry.delete(SkillRegistry);
  ctx.registry.delete(ToolRuntime);
  ctx.registry.delete(SystemPrompt);
  await rm(root, { recursive: true, force: true });
}
