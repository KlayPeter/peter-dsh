import {
  readText,
  rootPath,
  safePath,
  exists,
  hash,
  json,
  atomicWrite,
  removeEmpty,
  mkdir,
  unlink,
  path,
} from "./files.js";
import { inspectProject } from "./scan.js";
import { chooseStarter, starterNames, starterFiles } from "./starters.js";
import { renderFiles, loadPreset } from "./render.js";
export { inspectProject, loadPreset };
export { getGuide, skillRoot } from "./render.js";
const STATE = ".ai-init/state.json";
const CONFIG = ".ai-init/config.json";
const marks = (file) =>
  file === ".gitignore"
    ? ["# peter-ai:begin", "# peter-ai:end"]
    : ["<!-- peter-ai:begin -->", "<!-- peter-ai:end -->"];
function region(file, text) {
  const [start, end] = marks(file);
  const a = text.indexOf(start),
    b = text.indexOf(end);
  if (a < 0 && b < 0) return null;
  if (
    a < 0 ||
    b < a ||
    text.indexOf(start, a + 1) >= 0 ||
    text.indexOf(end, b + 1) >= 0
  )
    throw new Error(`Malformed managed markers: ${file}`);
  return { start: a, end: b + end.length, text: text.slice(a, b + end.length) };
}
function block(file, content) {
  const [a, b] = marks(file);
  return `${a}\n${content.trim()}\n${b}`;
}
async function readState(root) {
  const text = await readText(root, STATE);
  if (text === null) return null;
  const state = JSON.parse(text);
  if (
    state.schemaVersion !== 1 ||
    !state.entries ||
    Array.isArray(state.entries) ||
    typeof state.entries !== "object"
  )
    throw new Error(
      "Invalid initializer state. Restore .ai-init/state.json from Git.",
    );
  for (const [file, entry] of Object.entries(state.entries)) {
    await safePath(root, file);
    const allowed =
      entry.kind === "block"
        ? ["AGENTS.md", "CLAUDE.md", ".gitignore"]
        : entry.kind === "managed"
          ? [
              ".agent-context/project.md",
              ".agent-context/workflow.md",
              ".agent-context/feature-docs.md",
            ]
          : [
              ...new Set([
                "README.md",
                "docs/PROJECT_BRIEF.md",
                "docs/features/README.md",
                ...["node-cli", "python-cli", "static-web", "docs"].flatMap(
                  (s) => Object.keys(starterFiles(s)),
                ),
              ]),
            ];
    if (!allowed.includes(file))
      throw new Error("Unrecognized managed destination: " + file);
    if (
      !["block", "managed", "seed"].includes(entry.kind) ||
      !/^[a-f0-9]{64}$/.test(entry.hash)
    )
      throw new Error("Invalid managed entry: " + file);
  }
  return state;
}
function normalizeRequest(s) {
  if (
    typeof s !== "string" ||
    !s.trim() ||
    s.length > 8000 ||
    s.includes("peter-ai:")
  )
    throw new Error(
      "Provide a nonempty request up to 8,000 characters without reserved markers.",
    );
  return s.trim();
}
export async function planProject({
  root,
  request,
  preset,
  targets,
  starter,
  operation = "init",
} = {}) {
  root = await rootPath(root);
  if (!["init", "sync"].includes(operation))
    throw new Error("Operation must be init or sync.");
  if (starter && !starterNames.includes(starter))
    throw new Error("Unknown starter: " + starter);
  const scan = await inspectProject(root);
  const state = await readState(root);
  const configText = await readText(root, CONFIG);
  if (!state && configText !== null)
    throw new Error(
      "Existing .ai-init/config.json has no state; refusing to take ownership.",
    );
  if (operation === "sync" && !state)
    throw new Error("No initialized project. Run init first.");
  if (state && configText === null)
    throw new Error("Missing .ai-init/config.json; restore it before syncing.");
  const previous = configText ? JSON.parse(configText) : {};
  if (
    state &&
    (previous.schemaVersion !== 1 ||
      !starterNames.includes(previous.starter) ||
      previous.starter === "auto")
  )
    throw new Error("Invalid .ai-init/config.json.");
  request = normalizeRequest(request ?? previous.request);
  targets = targets ?? previous.targets ?? ["dsh", "codex"];
  if (
    !Array.isArray(targets) ||
    !targets.length ||
    targets.some((x) => !["dsh", "codex", "claude"].includes(x))
  )
    throw new Error("Targets must be dsh, codex, claude.");
  targets = [...new Set(targets)].sort();
  const preferences = await loadPreset(preset ?? previous.preset ?? "peter");
  const selected = state
    ? {
        starter: previous.starter,
        reason: "Existing managed project; scaffold is not regenerated.",
      }
    : scan.mode === "empty"
      ? chooseStarter(request, starter)
      : {
          starter: "none",
          reason: "Existing content detected; preserve its stack and files.",
        };
  if (state && starter && starter !== "auto" && starter !== previous.starter)
    throw new Error(
      "Changing starters on an initialized project is unsupported; edit the application directly.",
    );
  if (
    !state &&
    scan.mode === "existing" &&
    starter &&
    !["auto", "none"].includes(starter)
  )
    throw new Error(
      "Existing content detected. Scaffold only into a separate empty directory.",
    );
  const warnings = [...scan.warnings];
  if (!state && scan.instructions.length)
    warnings.push(
      "Existing instruction files detected. The host Agent must read them and resolve semantic conflicts; generated rules are additive.",
    );
  const base = {
    schemaVersion: 1,
    root,
    fingerprint: scan.fingerprint,
    mode: scan.mode,
    reason: selected.reason,
    warnings,
    questions: [],
    changes: [],
    conflicts: [],
  };
  if (!selected.starter)
    return {
      ...base,
      status: "needs-input",
      questions: [
        "这个空项目准备做什么、用什么技术栈？选择 node-cli / python-cli / static-web / docs；仅配置选 none。其他技术栈由当前 Agent 按需求搭建后，再按已有项目配置。",
      ],
    };
  const config = {
    schemaVersion: 1,
    request,
    preset: preferences,
    targets,
    starter: selected.starter,
  };
  const desired = renderFiles(scan, config, !state);
  const entries = {};
  for (const [file, old] of Object.entries(state?.entries || {}))
    if (old.kind === "seed") entries[file] = old;
  const changes = [],
    conflicts = [];
  const compare = async (file, item) => {
    const current = await readText(root, file);
    const old = state?.entries[file];
    const kind = item?.kind || old.kind;
    const part =
      kind === "block" && current !== null ? region(file, current) : null;
    if (
      old &&
      old.kind !== "seed" &&
      (current === null ||
        hash(old.kind === "block" ? (part?.text ?? "") : current) !== old.hash)
    ) {
      conflicts.push(
        `${file}: generated content was edited or removed; preserve it and resolve the diff before syncing.`,
      );
      return;
    }
    if (!old && current !== null && kind !== "config" && kind !== "block") {
      conflicts.push(
        `${file}: existing file is not owned by this initializer.`,
      );
      return;
    }
    if (!old && part) {
      conflicts.push(`${file}: managed marker exists without matching state.`);
      return;
    }
    let after = item?.content ?? null;
    if (kind === "block") {
      const rendered = item ? block(file, item.content) : "";
      if (part)
        after =
          current.slice(0, part.start) + rendered + current.slice(part.end);
      else
        after =
          (current === null
            ? ""
            : current + (current.endsWith("\n") ? "\n" : "\n\n")) +
          rendered +
          "\n";
      if (item) entries[file] = { kind, hash: hash(rendered) };
    } else if (item && kind !== "config")
      entries[file] = { kind, hash: hash(after) };
    if (current !== after)
      changes.push({
        path: file,
        action:
          after === null ? "delete" : current === null ? "create" : "update",
        before: current,
        after,
        beforeHash: current === null ? null : hash(current),
      });
  };
  for (const [file, item] of Object.entries(desired)) await compare(file, item);
  for (const [file, old] of Object.entries(state?.entries || {}))
    if (!(file in desired) && old.kind !== "seed") await compare(file, null);
  const stateAfter = json({
    schemaVersion: 1,
    generator: "@klaypeter/project-ai-init@0.1.0",
    entries,
  });
  const stateBefore = await readText(root, STATE);
  if (stateBefore !== stateAfter)
    changes.push({
      path: STATE,
      action: stateBefore === null ? "create" : "update",
      before: stateBefore,
      after: stateAfter,
      beforeHash: stateBefore === null ? null : hash(stateBefore),
    });
  // Snapshot every managed destination, including unchanged ones, before application.
  const guards = {};
  for (const file of new Set([
    ...Object.keys(desired),
    ...Object.keys(state?.entries || {}),
    STATE,
  ])) {
    if (state?.entries[file]?.kind === "seed") continue;
    const text = await readText(root, file);
    guards[file] = text === null ? null : hash(text);
  }
  return {
    ...base,
    status: conflicts.length ? "conflict" : "ready",
    config,
    changes,
    guards,
    conflicts,
  };
}
export async function applyPlan(plan, { signal } = {}) {
  if (plan.status !== "ready")
    throw new Error(
      `Plan is ${plan.status}: ${[...(plan.questions || []), ...(plan.conflicts || [])].join("; ")}`,
    );
  signal?.throwIfAborted();
  const root = await rootPath(plan.root);
  const stateDir = path.join(root, ".ai-init");
  const createdDirs = [],
    completed = [];
  await safePath(root, STATE);
  if (!(await exists(stateDir))) {
    await mkdir(stateDir);
    createdDirs.push(stateDir);
  }
  const lock = await safePath(root, ".ai-init/lock");
  const { open } = await import("node:fs/promises");
  let handle;
  try {
    handle = await open(lock, "wx", 0o600);
  } catch (e) {
    await removeEmpty(createdDirs);
    if (e.code === "EEXIST")
      throw new Error(
        "Initializer is locked; another operation is active. If it crashed, inspect and remove .ai-init/lock manually.",
      );
    throw e;
  }
  try {
    if ((await inspectProject(root)).fingerprint !== plan.fingerprint)
      throw new Error("Project changed after planning; regenerate the plan.");
    for (const [file, expected] of Object.entries(plan.guards)) {
      const text = await readText(root, file);
      if ((text === null ? null : hash(text)) !== expected)
        throw new Error(`File changed after planning: ${file}`);
    }
    for (const change of plan.changes) {
      signal?.throwIfAborted();
      const current = await readText(root, change.path);
      if ((current === null ? null : hash(current)) !== change.beforeHash)
        throw new Error(`File changed during apply: ${change.path}`);
      if (change.after === null)
        await unlink(await safePath(root, change.path));
      else await atomicWrite(root, change.path, change.after, createdDirs);
      completed.push(change);
    }
    return {
      status: "applied",
      root,
      changed: completed.map((c) => ({ path: c.path, action: c.action })),
      warnings: plan.warnings,
      next:
        plan.mode === "empty" && plan.config.starter !== "none"
          ? "Scaffold created, business features are not implemented. Run its documented checks, then sync to refresh project facts."
          : "Review generated instructions in the target Agent; no project commands were executed.",
    };
  } catch (error) {
    const rollbackErrors = [];
    for (const c of [...completed].reverse()) {
      try {
        const now = await readText(root, c.path);
        if (
          (now === null ? null : hash(now)) !==
          (c.after === null ? null : hash(c.after))
        )
          throw new Error("Concurrent edit detected; not overwriting it.");
        if (c.before === null) await unlink(await safePath(root, c.path));
        else await atomicWrite(root, c.path, c.before, createdDirs);
      } catch (e) {
        rollbackErrors.push(`${c.path}: ${e.message}`);
      }
    }
    if (rollbackErrors.length)
      throw new Error(
        `${error.message}; rollback requires attention: ${rollbackErrors.join("; ")}`,
      );
    throw error;
  } finally {
    await handle.close();
    await unlink(lock);
    await removeEmpty(createdDirs);
  }
}
export async function initialize(options = {}) {
  const plan = await planProject(options);
  return options.dryRun || plan.status !== "ready"
    ? plan
    : applyPlan(plan, options);
}
export async function doctor(root) {
  root = await rootPath(root);
  const state = await readState(root);
  if (!state) return { status: "not-initialized", issues: ["Run init first."] };
  const issues = [];
  for (const [file, entry] of Object.entries(state.entries)) {
    try {
      const text = await readText(root, file);
      if (text === null) issues.push(`Missing: ${file}`);
      else if (
        entry.kind !== "seed" &&
        hash(
          entry.kind === "block" ? (region(file, text)?.text ?? "") : text,
        ) !== entry.hash
      )
        issues.push(`Modified managed content: ${file}`);
    } catch (e) {
      issues.push(e.message);
    }
  }
  let refresh = false,
    warnings = [];
  try {
    const plan = await planProject({ root, operation: "sync" });
    warnings = plan.warnings;
    refresh = plan.changes.some((c) => c.path !== STATE);
    issues.push(
      ...plan.conflicts.filter(
        (c) => !issues.some((i) => i.includes(c.split(":")[0])),
      ),
    );
  } catch (e) {
    issues.push(e.message);
  }
  return {
    status: issues.length
      ? "needs-attention"
      : refresh
        ? "refresh-available"
        : "checks-passed",
    issues,
    warnings,
    refreshAvailable: refresh,
    limitation:
      "Checks ownership and detected configuration; does not execute commands or prove that every Agent loaded the instructions.",
  };
}
