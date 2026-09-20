import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
if (!process.env.DSH_MODULE_ROOT)
  throw new Error(
    "Set DSH_MODULE_ROOT to your existing Harness node_modules directory.",
  );
const require = createRequire(
  path.join(path.resolve(process.env.DSH_MODULE_ROOT), ".smoke.cjs"),
);
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { Context } = await load("@deepseek-ai/cordis");
const { ToolRuntime } = await load("@deepseek-ai/dsh-tools");
const { SkillRegistry } = await load("@deepseek-ai/dsh-skill");
const { SystemPrompt } = await load("@deepseek-ai/dsh-system-prompt");
const plugin = await import("../packages/project-ai-init/src/dsh.js");
const root = await mkdtemp(path.join(os.tmpdir(), "peter-ai-harness-"));
const ctx = new Context();
try {
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(ToolRuntime);
  await ctx.plugin(SkillRegistry);
  const fiber = await ctx.plugin(plugin, { workspaceRoot: root });
  assert.equal(ctx.tools.schemas().length, 4);
  assert.ok(
    (await ctx.skills.list()).some((x) => x.name === "project-ai-init"),
  );
  let id = 0;
  const run = async (name, args = {}) => {
    const r = await ctx.tools.execute({
      callId: `smoke-${++id}`,
      name,
      arguments: args,
      signal: new AbortController().signal,
    });
    assert.equal(r.isError, false, JSON.stringify(r));
    return JSON.parse(r.content.find((x) => x.type === "text").text);
  };
  assert.equal((await run("ai_project_inspect")).mode, "empty");
  const plan = await run("ai_project_plan", {
    request: "Node CLI",
    targets: "dsh,codex",
  });
  assert.equal(plan.status, "ready");
  assert.equal(
    (await run("ai_project_apply", { planId: plan.planId })).status,
    "applied",
  );
  assert.ok(await readFile(path.join(root, "AGENTS.md"), "utf8"));
  const reused = await ctx.tools.execute({
    callId: "reused",
    name: "ai_project_apply",
    arguments: { planId: plan.planId },
    signal: new AbortController().signal,
  });
  assert.equal(reused.isError, true);
  const refresh = await run("ai_project_plan", {
    request: "Node CLI",
    operation: "sync",
  });
  await run("ai_project_apply", { planId: refresh.planId });
  assert.equal((await run("ai_project_doctor")).status, "checks-passed");
  await fiber.dispose();
  assert.equal(ctx.tools.schemas().length, 0);
  assert.equal((await ctx.skills.list()).length, 0);
  console.log(
    "Project AI Harness smoke passed: inspect, plan, apply, sync, doctor, consumed plan and unload.",
  );
} finally {
  ctx.registry.delete(SkillRegistry);
  ctx.registry.delete(ToolRuntime);
  ctx.registry.delete(SystemPrompt);
  await rm(root, { recursive: true, force: true });
}
