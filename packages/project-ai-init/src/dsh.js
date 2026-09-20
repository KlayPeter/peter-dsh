import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  inspectProject,
  planProject,
  applyPlan,
  doctor,
  skillRoot,
} from "./index.js";
export const name = "peter-project-ai-init";
export const inject = ["tools"];
export function apply(ctx, config = {}) {
  const root = path.resolve(config.workspaceRoot || process.cwd());
  const plans = new Map();
  const output = {
    schema: { type: "string" },
    render: (_args, value) => [{ type: "text", text: value }],
  };
  const register = (spec) =>
    ctx.tools.register(defineTool({ ...spec, output }));
  register({
    name: "ai_project_inspect",
    description: `Inspect existing files and stack in ${root}, without executing scripts. Read existing instructions before planning.`,
    parameters: {},
    async execute() {
      return JSON.stringify(await inspectProject(root));
    },
  });
  register({
    name: "ai_project_plan",
    description: `Plan AI configuration in ${root} from the user's actual request. Empty projects may get a small starter; existing projects keep their stack. Returns a preview and short-lived planId. No writes.`,
    parameters: {
      request: { type: "string", required: true },
      preset: { type: "string", enum: ["peter", "minimal"] },
      targets: {
        type: "string",
        description: "Comma-separated dsh,codex,claude",
      },
      starter: {
        type: "string",
        enum: ["auto", "none", "node-cli", "python-cli", "static-web", "docs"],
      },
      operation: { type: "string", enum: ["init", "sync"] },
    },
    async execute(args, exec) {
      exec?.signal?.throwIfAborted();
      const plan = await planProject({
        root,
        ...args,
        targets: args.targets?.split(",").map((x) => x.trim()),
      });
      if (plan.status !== "ready") return JSON.stringify(plan);
      if (plans.size >= 10) plans.delete(plans.keys().next().value);
      const id = randomUUID();
      plans.set(id, {
        plan,
        owner: exec?.agent?.session ?? null,
        time: Date.now(),
      });
      return JSON.stringify({ planId: id, ...plan });
    },
  });
  register({
    name: "ai_project_apply",
    description:
      "Apply a previously reviewed ai_project_plan within the user-authorized task. Fails if files changed; preserves human content and rolls back this operation on failure. Does not run project code.",
    parameters: { planId: { type: "string", required: true } },
    async execute(args, exec) {
      const item = plans.get(args.planId);
      if (
        !item ||
        item.owner !== (exec?.agent?.session ?? null) ||
        Date.now() - item.time > 30 * 60 * 1000
      )
        throw new Error(
          "Missing or expired plan for this session; create a fresh plan.",
        );
      plans.delete(args.planId);
      return JSON.stringify(
        await applyPlan(item.plan, { signal: exec?.signal }),
      );
    },
  });
  register({
    name: "ai_project_doctor",
    description: `Check managed configuration in ${root}; does not run scripts or fix files.`,
    parameters: {},
    async execute() {
      return JSON.stringify(await doctor(root));
    },
  });
  ctx.inject(["skills"], (child) =>
    child.skills.register({
      name: "project-ai-init",
      description:
        "结合用户目标、项目内容和偏好，初始化空项目或更新已有项目的 Agent 配置。",
      source: "runtime",
      provider: name,
      resourceBase: { kind: "directory", path: skillRoot },
      content:
        readFileSync(path.join(skillRoot, "SKILL.md"), "utf8").replace(
          /^---\n[\s\S]*?\n---\n/,
          "",
        ) +
        "\nHarness 中使用 ai_project_inspect、ai_project_plan、ai_project_apply、ai_project_doctor；路径以工具说明的 workspaceRoot 为准。",
    }),
  );
}
