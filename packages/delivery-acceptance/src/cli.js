#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import {
  start,
  runChecks,
  inspect,
  check,
  observe,
  report,
  exportReport,
  skillRoot,
} from "./index.js";
const help = `peter-accept start --root ./project --contract ./acceptance.json
peter-accept run --root ./project --run <run-id> --criteria C1,C2 --contract-hash <hash> [--export]
peter-accept inspect --root ./project --run <run-id>
peter-accept check --root ./project --run <run-id> --criterion C1
peter-accept observe --root ./project --run <run-id> --criterion C2 --note "Observed UI" --outcome pass --artifact screenshots/ui.png
peter-accept report --root ./project --run <run-id> [--export]
peter-accept install-skill --target .agents/skills
check executes exactly the command declared in the contract; inspect it first.
report exit codes: 0 scoped checks pass, 2 incomplete evidence, 3 failed required checks, 1 error.
`;
try {
  const { values: v, positionals: p } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(
      [
        "root",
        "contract",
        "run",
        "criterion",
        "criteria",
        "contract-hash",
        "note",
        "outcome",
        "artifact",
        "producer",
        "target",
      ]
        .map((k) => [k, { type: "string" }])
        .concat([
          ["help", { type: "boolean", short: "h" }],
          ["export", { type: "boolean" }],
        ]),
    ),
  });
  if (v.help || !p.length) {
    console.log(help);
  } else {
    if (p.length !== 1) throw new Error("Unexpected positional arguments");
    let result;
    const args = {
      root: v.root,
      run: v.run,
      criterion: v.criterion,
      note: v.note,
      outcome: v.outcome,
      artifact: v.artifact,
      producer: v.producer,
    };
    if (p[0] === "start") {
      if (!v.contract) throw new Error("--contract required");
      result = await start({
        root: v.root,
        contract: JSON.parse(await readFile(v.contract, "utf8")),
      });
    } else if (p[0] === "run") {
      result = await runChecks({
        ...args,
        criteria: v.criteria?.split(",").map((x) => x.trim()),
        contractHash: v["contract-hash"],
        export: v.export,
      });
      process.exitCode =
        result.verdict === "verified-within-scope"
          ? 0
          : result.verdict === "not-complete"
            ? 3
            : 2;
    } else if (p[0] === "inspect") result = await inspect(args);
    else if (p[0] === "check") {
      result = await check(args);
      if (result.status !== "passed") process.exitCode = 2;
    } else if (p[0] === "observe") result = await observe(args);
    else if (p[0] === "report") {
      result = await (v.export ? exportReport : report)(args);
      process.exitCode =
        result.verdict === "verified-within-scope"
          ? 0
          : result.verdict === "not-complete"
            ? 3
            : 2;
    } else if (p[0] === "install-skill") {
      if (!v.target) throw new Error("--target required");
      const dest = path.resolve(v.target, "delivery-acceptance");
      await mkdir(path.dirname(dest), { recursive: true });
      await mkdir(dest);
      try {
        for (const entry of await readdir(skillRoot))
          await cp(path.join(skillRoot, entry), path.join(dest, entry), {
            recursive: true,
            force: false,
            errorOnExist: true,
          });
        await cp(
          new URL("../vendor/", import.meta.url),
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
        note: "Install peter-accept CLI separately.",
      };
    } else throw new Error("Unknown command");
    console.log(JSON.stringify(result, null, 2));
  }
} catch (e) {
  console.error("Error: " + e.message);
  process.exitCode = 1;
}
