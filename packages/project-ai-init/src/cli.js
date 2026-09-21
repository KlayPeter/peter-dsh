#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile, readdir, cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  inspectProject,
  initialize,
  doctor,
  getGuide,
  skillRoot,
} from "./index.js";
import { inspectReference, exportPreferences } from "./preferences.js";
import { toolingPlan, setupCodegraph } from "./tooling.js";
const help = `Peter Project AI Init 0.4.0\n\npeter-ai inspect --root ./project\npeter-ai init --root ./project --request "做一个 Python 命令行工具" [--starter python-cli] [--targets dsh,codex,claude] [--preset peter|minimal] [--dry-run]\npeter-ai sync --root ./project [--request "新的目标"] [--dry-run]\npeter-ai doctor --root ./project\npeter-ai guide --mode empty|existing\npeter-ai install-skill --target .agents/skills\n\n--layout compact|expanded  New projects default to compact + minimal
--facts-file ./facts.json  Evidence-backed project notes [{text,sources:[path]}]
--starter auto|none|node-cli|python-cli|static-web|docs\n--preset-file ./my-preferences.json  Custom preset with id, rules, featureDocs\nreference --root /reference/repo: read preference evidence\npreferences-export --root ./project: portable preset JSON\ntools --root ./project: required tools\nsetup-codegraph --root ./project [--dry-run]: install and index CodeGraph\n--project-rules-file ./project-rules.json: project-only rules array\nNo model calls or Git commits. setup-codegraph installs a pinned package and indexes the target.\n`;
async function main() {
  const { values: v, positionals: p } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: "string" },
      layout: { type: "string" },
      "facts-file": { type: "string" },
      request: { type: "string" },
      preset: { type: "string" },
      "preset-file": { type: "string" },
      "project-rules-file": { type: "string" },
      targets: { type: "string" },
      starter: { type: "string" },
      "dry-run": { type: "boolean" },
      mode: { type: "string" },
      target: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (v.help || !p.length) return console.log(help);
  if (p.length !== 1) throw new Error("Unexpected positional arguments.");
  const cmd = p[0];
  let result;
  if (cmd === "reference") result = await inspectReference(v.root);
  else if (cmd === "preferences-export")
    result = await exportPreferences(v.root);
  else if (cmd === "tools") result = await toolingPlan(v.root);
  else if (cmd === "setup-codegraph")
    result = await setupCodegraph({ root: v.root, dryRun: v["dry-run"] });
  else if (cmd === "inspect") result = await inspectProject(v.root);
  else if (cmd === "guide")
    return console.log(await getGuide({ mode: v.mode }));
  else if (cmd === "doctor") {
    result = await doctor(v.root);
    if (["needs-attention", "not-initialized"].includes(result.status))
      process.exitCode = 1;
    else if (result.status === "needs-review") process.exitCode = 2;
  } else if (["init", "sync"].includes(cmd)) {
    if (v.preset && v["preset-file"])
      throw new Error("Choose --preset or --preset-file.");
    const options = {
      root: v.root,
      layout: v.layout,
      projectFacts: v["facts-file"] ? JSON.parse(await readFile(v["facts-file"], "utf8")) : undefined,
      projectRules: v["project-rules-file"]
        ? JSON.parse(await readFile(v["project-rules-file"], "utf8"))
        : undefined,
      request: v.request,
      preset: v["preset-file"]
        ? JSON.parse(await readFile(v["preset-file"], "utf8"))
        : v.preset,
      targets: v.targets?.split(",").map((s) => s.trim()),
      starter: v.starter,
      operation: cmd,
      dryRun: v["dry-run"],
    };
    result = await initialize(options);
    if (["needs-input", "conflict"].includes(result.status))
      process.exitCode = 2;
  } else if (cmd === "install-skill") {
    if (!v.target) throw new Error("--target is required.");
    const dest = path.resolve(v.target, "project-ai-init");
    await mkdir(path.dirname(dest), { recursive: true });
    await mkdir(dest);
    try {
      for (const entry of await readdir(skillRoot))
        await cp(path.join(skillRoot, entry), path.join(dest, entry), {
          recursive: true,
          errorOnExist: true,
          force: false,
        });
      await cp(
        fileURLToPath(new URL("../vendor/", import.meta.url)),
        path.join(dest, "upstream"),
        { recursive: true },
      );
    } catch (e) {
      await rm(dest, { recursive: true, force: true });
      throw e;
    }
    result = {
      status: "installed",
      path: dest,
      note: "Install peter-ai CLI separately; refresh Agent skill discovery.",
    };
  } else throw new Error("Unknown command: " + cmd);
  console.log(JSON.stringify(result, null, 2));
}
main().catch((e) => {
  console.error("Error: " + e.message);
  process.exitCode = 1;
});
