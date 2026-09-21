import { readFileSync } from "node:fs";
import path from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  start,
  inspect,
  check,
  observe,
  exportReport,
  skillRoot,
} from "./index.js";
export const name = "peter-delivery-acceptance";
export const inject = ["tools"];
export function apply(ctx, config = {}) {
  const root = path.resolve(config.workspaceRoot || process.cwd());
  const str = (required = false) => ({
    type: "string",
    ...(required ? { required: true } : {}),
  });
  function register(name, description, parameters, fn) {
    ctx.tools.register(
      defineTool({
        name,
        description,
        parameters,
        output: {
          schema: { type: "string" },
          render: (_a, value) => [{ type: "text", text: value }],
        },
        async execute(args, exec) {
          return JSON.stringify(
            await fn({ ...args, root, signal: exec?.signal }),
          );
        },
      }),
    );
  }
  register(
    "acceptance_start",
    `Create a task acceptance contract in ${root}. Does not run checks. Extract criteria from the original user task, mark inferred criteria derived, include all relevant source/test/config files in scope. Never treat the agent completion message as task authority.`,
    { contractJson: str(true) },
    (a) => start({ root, contract: JSON.parse(a.contractJson) }),
  );
  register(
    "acceptance_inspect",
    "Read the frozen contract and exact commands before running checks.",
    { run: str(true) },
    inspect,
  );
  register(
    "acceptance_check",
    "Execute one declared command or file assertion in the configured project. Commands are NOT sandboxed and may have side effects. Run only reviewed checks within user task authorization; no copied untrusted commands. Captures output and scoped snapshot.",
    { run: str(true), criterion: str(true) },
    check,
  );
  register(
    "acceptance_observe",
    "Record a host/browser/manual observation with optional local artifact. Positive self-reports remain needs-review and cannot independently establish completion.",
    {
      run: str(true),
      criterion: str(true),
      note: str(true),
      outcome: { type: "string", enum: ["pass", "fail", "blocked", "unknown"] },
      artifact: str(),
      producer: str(),
    },
    observe,
  );
  register(
    "acceptance_report",
    "Recheck evidence freshness and export immutable Markdown/JSON reports. Scoped automated pass is not proof of omitted requirements, semantic correctness, live production state or user acceptance.",
    { run: str(true) },
    exportReport,
  );
  ctx.inject(["skills"], (child) =>
    child.skills.register({
      name: "delivery-acceptance",
      description:
        "核对任务是否真的完成：逐项验收、采集证据、检查过期与遗漏、报告剩余工作。",
      source: "runtime",
      provider: name,
      resourceBase: { kind: "directory", path: skillRoot },
      content: readFileSync(path.join(skillRoot, "SKILL.md"), "utf8").replace(
        /^---\n[\s\S]*?\n---\n/,
        "",
      ),
    }),
  );
}
