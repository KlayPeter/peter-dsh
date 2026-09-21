// Opt-in integration: downloads pinned CodeGraph into a temporary project.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setupCodegraph } from "../packages/project-ai-init/src/tooling.js";
if (!process.env.DSH_MODULE_ROOT)
  throw new Error("Set DSH_MODULE_ROOT to Harness node_modules.");
const require = createRequire(
  path.join(path.resolve(process.env.DSH_MODULE_ROOT), ".smoke.cjs"),
);
const load = async (name) => import(pathToFileURL(require.resolve(name)).href);
const { Context } = await load("@deepseek-ai/cordis");
const { ToolRuntime } = await load("@deepseek-ai/dsh-tools");
const { SystemPrompt } = await load("@deepseek-ai/dsh-system-prompt");
const bridge = await load("@deepseek-ai/dsh-mcp-client");
const root = await mkdtemp(path.join(os.tmpdir(), "peter-codegraph-"));
const ctx = new Context();
let fiber;
try {
  await writeFile(
    path.join(root, "example.js"),
    "export const answer = () => 42;\n",
  );
  const result = await setupCodegraph({ root });
  const overlay = JSON.parse(await readFile(result.overlay, "utf8"));
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(ToolRuntime);
  fiber = await ctx.plugin(bridge, overlay[0].insert[0].config);
  assert.ok(
    ctx.tools
      .schemas()
      .some(
        (x) =>
          x.function?.name === "mcp__codegraph__codegraph_explore" ||
          x.name === "mcp__codegraph__codegraph_explore",
      ),
  );
  const response = await ctx.tools.execute({
    callId: "read-only",
    name: "mcp__codegraph__codegraph_explore",
    arguments: { query: "answer" },
    signal: new AbortController().signal,
  });
  assert.equal(response.isError, false, JSON.stringify(response));
  console.log(
    "CodeGraph package install, index, dsh MCP bridge and read-only query passed.",
  );
} finally {
  await fiber?.dispose();
  ctx.registry.delete(ToolRuntime);
  ctx.registry.delete(SystemPrompt);
  await rm(root, { recursive: true, force: true });
}
