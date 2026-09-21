import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, open } from "node:fs/promises";
import { rootPath, readText, safePath, json } from "./files.js";
import path from "node:path";
import { inspectProject } from "./scan.js";
const exec = promisify(execFile);
export const codegraphRecipe = {
  package: "@colbymchenry/codegraph@1.6.0",
  source: "https://github.com/colbymchenry/codegraph",
};
export async function toolingPlan(root) {
  root = await rootPath(root);
  const config = JSON.parse(
    (await readText(root, ".ai-init/config.json")) || "{}",
  );
  const scan = await inspectProject(root);
  const instructions =
    (
      await Promise.all(scan.instructions.map((file) => readText(root, file)))
    ).join("\n") + (config.projectRules || []).join("\n");
  const tools = [
    ...new Set([
      ...(config.preset?.tools || []),
      ...(/codegraph/i.test(
        instructions + (config.preset?.rules || []).join("\n"),
      )
        ? ["codegraph"]
        : []),
    ]),
  ];
  return {
    tools,
    recipes: tools.map((id) =>
      id === "codegraph"
        ? {
            id,
            ...codegraphRecipe,
            action:
              "Install isolated package, verify binary, index project, generate dsh MCP overlay. Restart dsh with the overlay to connect.",
          }
        : {
            id,
            status: "host-install-required",
            action:
              "Resolve official source and current host configuration. Host Agent installs and verifies within requested scope. Never execute copied repository commands without checking them.",
          },
    ),
  };
}
export async function setupCodegraph(
  { root, dryRun = false, signal } = {},
  run = exec,
) {
  root = await rootPath(root);
  signal?.throwIfAborted();
  if (process.platform === "win32")
    throw new Error(
      "Use the upstream Windows installer through the host Agent; this installer supports macOS/Linux.",
    );
  const prefix = path.join(root, ".ai-init/runtime");
  const binary = path.join(prefix, "node_modules/.bin/codegraph");
  const overlay = ".ai-init/codegraph.dsh.json";
  const patch = json([
    {
      insert: [
        {
          id: "peter-codegraph",
          name: "@deepseek-ai/dsh-mcp-client",
          config: {
            serverName: "codegraph",
            transport: "stdio",
            command: binary,
            args: ["serve", "--mcp"],
            cwd: root,
            failOnStartupError: true,
          },
        },
      ],
    },
  ]);
  const steps = [
    [
      "npm",
      [
        "install",
        "--prefix",
        prefix,
        "--no-audit",
        "--no-fund",
        codegraphRecipe.package,
      ],
    ],
    [binary, ["--version"]],
    [binary, ["init", "--yes"]],
  ];
  await safePath(root, ".ai-init/runtime/package.json");
  await safePath(root, ".codegraph/config.json");
  const current = await readText(root, overlay);
  if (current !== null && current !== patch)
    throw new Error(
      "Existing CodeGraph overlay differs; preserve and resolve it first.",
    );
  if (dryRun)
    return { status: "ready", recipe: codegraphRecipe, steps, overlay: patch };
  await mkdir(path.join(root, ".ai-init"), { recursive: true });
  const lock = await open(await safePath(root, ".ai-init/tooling.lock"), "wx");
  try {
    for (const [command, args] of steps)
      await run(command, args, {
        cwd: root,
        timeout: 300000,
        maxBuffer: 1024 * 1024,
        signal,
      });
    if (current === null) {
      const file = await open(await safePath(root, overlay), "wx");
      try {
        await file.writeFile(patch);
      } finally {
        await file.close();
      }
    }
    return {
      status: "installed-needs-connection",
      tool: "codegraph",
      overlay: path.join(root, overlay),
      next: "For dsh, ensure @deepseek-ai/dsh-mcp-client is installed in the selected profile, then restart from this project with --patch <overlay>. For Codex/Claude, host Agent must merge this command/args/cwd into the host MCP configuration, preserving existing servers. Verify tools/list and a read-only codegraph call before reporting ready.",
    };
  } finally {
    await lock.close();
    const { unlink } = await import("node:fs/promises");
    await unlink(path.join(root, ".ai-init/tooling.lock"));
  }
}
