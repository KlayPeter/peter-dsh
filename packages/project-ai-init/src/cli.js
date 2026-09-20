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
const help = `Peter Project AI Init 0.1.0\n\npeter-ai inspect --root ./project\npeter-ai init --root ./project --request "做一个 Python 命令行工具" [--starter python-cli] [--targets dsh,codex,claude] [--preset peter|minimal] [--dry-run]\npeter-ai sync --root ./project [--request "新的目标"] [--dry-run]\npeter-ai doctor --root ./project\npeter-ai guide --mode empty|existing\npeter-ai install-skill --target .agents/skills\n\n--starter auto|none|node-cli|python-cli|static-web|docs\n--preset-file ./my-preferences.json  Custom preset with id, rules, featureDocs\nNo model calls, dependency installation, project script execution, or Git commits.\n`;
async function main() {
  const { values: v, positionals: p } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: "string" },
      request: { type: "string" },
      preset: { type: "string" },
      "preset-file": { type: "string" },
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
  if (cmd === "inspect") result = await inspectProject(v.root);
  else if (cmd === "guide")
    return console.log(await getGuide({ mode: v.mode }));
  else if (cmd === "doctor") {
    result = await doctor(v.root);
    if (["needs-attention", "not-initialized"].includes(result.status))
      process.exitCode = 1;
  } else if (["init", "sync"].includes(cmd)) {
    if (v.preset && v["preset-file"])
      throw new Error("Choose --preset or --preset-file.");
    const options = {
      root: v.root,
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
