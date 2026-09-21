import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  rootPath,
  relative,
  safe,
  readJson,
  createJson,
  createRun,
  snapshot,
  readRecords,
  store,
  id,
  hash,
  json,
  readFile,
  lstat,
  mkdir,
  writeFile,
  path,
  randomUUID,
} from "./storage.js";
const exec = promisify(execFile);
export const skillRoot = fileURLToPath(
  new URL("../skills/delivery-acceptance/", import.meta.url),
);
const text = (x, name, max = 8000) => {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error("Invalid " + name);
  return x;
};
export function validateContract(c) {
  if (!c || c.schemaVersion !== 1)
    throw new Error("Contract schemaVersion must be 1");
  text(c.task, "task");
  text(c.source, "source");
  if (!Array.isArray(c.scope) || !c.scope.length || c.scope.length > 100)
    throw new Error("Specify 1–100 relevant files/directories in scope");
  for (const p of c.scope) {
    relative(p);
    if (
      p
        .split("/")
        .some((x) =>
          [".delivery-acceptance", "node_modules", ".git"].includes(x),
        )
    )
      throw new Error("Evidence/dependency folders cannot be snapshot scope");
  }
  if (
    !Array.isArray(c.criteria) ||
    !c.criteria.length ||
    c.criteria.length > 100
  )
    throw new Error("Specify 1–100 criteria");
  const seen = new Set();
  for (const r of c.criteria) {
    id(r.id);
    if (seen.has(r.id)) throw new Error("Duplicate criterion");
    seen.add(r.id);
    text(r.requirement, "requirement");
    text(r.expected, "expected");
    if (
      !["user", "derived"].includes(r.origin) ||
      typeof r.required !== "boolean"
    )
      throw new Error("Specify criterion origin and required");
    if (!["command", "artifact", "manual"].includes(r.method))
      throw new Error("Unknown method");
    if (r.method === "command") {
      text(r.command?.file, "command executable", 2000);
      if (
        !Array.isArray(r.command.args) ||
        r.command.args.length > 100 ||
        r.command.args.some((a) => typeof a !== "string" || a.length > 8000)
      )
        throw new Error("Command args must be strings");
      if (r.command.cwd) relative(r.command.cwd);
      if (
        r.command.timeoutMs !== undefined &&
        (!Number.isInteger(r.command.timeoutMs) ||
          r.command.timeoutMs < 1 ||
          r.command.timeoutMs > 120000)
      )
        throw new Error("Timeout must be 1–120000ms");
      if (r.stdoutIncludes !== undefined)
        text(r.stdoutIncludes, "stdoutIncludes");
    }
    if (r.method === "artifact") {
      relative(r.artifact);
      if (
        !c.scope.some((p) => r.artifact === p || r.artifact.startsWith(p + "/"))
      )
        throw new Error("Artifact must be within scope");
      if (r.contains !== undefined) text(r.contains, "contains");
    }
  }
  if (!c.criteria.some((r) => r.required))
    throw new Error("At least one required criterion is needed");
  return c;
}
async function contractAt(root, run) {
  return validateContract(await readJson(root, `${store(run)}/contract.json`));
}
export async function start({ root, contract }) {
  root = await rootPath(root);
  contract = JSON.parse(json(validateContract(contract)));
  await snapshot(root, contract.scope);
  const run = await createRun(root, contract);
  return {
    run,
    contract,
    status: "planned",
    next: "Review scope, criteria and exact commands against the original user task before executing. No checks have run.",
  };
}
export async function inspect({ root, run }) {
  root = await rootPath(root);
  return { run, contract: await contractAt(root, run) };
}
export async function check({ root, run, criterion, signal }) {
  root = await rootPath(root);
  const c = await contractAt(root, run),
    r = c.criteria.find((x) => x.id === criterion);
  if (!r) throw new Error("Unknown criterion");
  if (r.method === "manual")
    throw new Error("Manual criteria require an observation; use observe");
  signal?.throwIfAborted();
  const lockPath = await safe(root, `${store(run)}/lock`);
  await writeFile(lockPath, "running", { flag: "wx" });
  try {
    const before = await snapshot(root, c.scope);
    const startedAt = new Date().toISOString();
    let stdout = "",
      stderr = "",
      exitCode = null,
      status = "failed",
      reason = "";
    if (r.method === "command") {
      const cwd = r.command.cwd ? await safe(root, r.command.cwd) : root;
      if (!(await lstat(cwd)).isDirectory())
        throw new Error("Command cwd must be a directory");
      try {
        const result = await exec(r.command.file, r.command.args, {
          cwd,
          timeout: r.command.timeoutMs || 60000,
          maxBuffer: 1024 * 1024,
          signal,
          encoding: "utf8",
          shell: false,
        });
        stdout = result.stdout;
        stderr = result.stderr;
        exitCode = 0;
        status =
          r.stdoutIncludes && !stdout.includes(r.stdoutIncludes)
            ? "failed"
            : "passed";
        reason =
          status === "passed"
            ? "Command exited 0 and configured assertions passed"
            : "Expected stdout text missing";
      } catch (e) {
        stdout = String(e.stdout || "");
        stderr = String(e.stderr || "");
        exitCode = typeof e.code === "number" ? e.code : null;
        reason = `Command failed or could not complete: ${e.code || e.message}`;
      }
    } else {
      try {
        const f = await safe(root, r.artifact),
          stat = await lstat(f);
        if (!stat.isFile() || stat.size === 0)
          throw new Error("Expected nonempty regular file");
        if (stat.size > 64 * 1024 * 1024) throw new Error("Artifact too large");
        const bytes = await readFile(f);
        stdout = json({
          path: r.artifact,
          bytes: bytes.length,
          sha256: hash(bytes),
        });
        status =
          r.contains && !bytes.toString("utf8").includes(r.contains)
            ? "failed"
            : "passed";
        reason =
          status === "passed"
            ? "File exists and configured assertions passed"
            : "Expected file text missing";
      } catch (e) {
        reason = e.message;
      }
    }
    const after = await snapshot(root, c.scope);
    if (before.digest !== after.digest) {
      status = "stale";
      reason =
        "Scoped files changed during verification; review changes and run again";
    }
    const record = {
      schemaVersion: 1,
      root,
      sequence: (await readRecords(root, run)).length + 1,
      files: after.files,
      id: randomUUID(),
      criterion: r.id,
      kind: r.method,
      producer: "runner",
      startedAt,
      finishedAt: new Date().toISOString(),
      contractHash: hash(json(c)),
      snapshot: after.digest,
      beforeSnapshot: before.digest,
      status,
      reason,
      exitCode,
      stdout,
      stderr,
      command: r.command || null,
    };
    await createJson(root, `${store(run)}/evidence/${record.id}.json`, record);
    return record;
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  }
}
export async function observe({
  root,
  run,
  criterion,
  note,
  artifact,
  outcome = "unknown",
  producer = "host-agent",
}) {
  root = await rootPath(root);
  const c = await contractAt(root, run);
  if (!c.criteria.some((x) => x.id === criterion))
    throw new Error("Unknown criterion");
  text(note, "note");
  if (!["pass", "fail", "blocked", "unknown"].includes(outcome))
    throw new Error("Invalid observation outcome");
  text(producer, "producer", 200);
  let attachment = null;
  if (artifact) {
    relative(artifact);
    const f = await safe(root, artifact);
    const stat = await lstat(f);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
      throw new Error("Attachment must be a file <=16 MiB");
    attachment = { path: artifact, sha256: hash(await readFile(f)) };
  }
  const lockPath = await safe(root, `${store(run)}/lock`);
  await writeFile(lockPath, "observing", { flag: "wx" });
  try {
    const state = await snapshot(root, c.scope);
    const record = {
      schemaVersion: 1,
      root,
      sequence: (await readRecords(root, run)).length + 1,
      id: randomUUID(),
      criterion,
      kind: "observation",
      producer,
      note,
      outcome,
      attachment,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      contractHash: hash(json(c)),
      snapshot: state.digest,
      status:
        outcome === "fail"
          ? "failed"
          : outcome === "blocked"
            ? "blocked"
            : "needs-review",
    };
    await createJson(root, `${store(run)}/evidence/${record.id}.json`, record);
    return record;
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  }
}
const esc = (x) =>
  String(x)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export async function report({ root, run }) {
  root = await rootPath(root);
  const lockPath = await safe(root, `${store(run)}/lock`);
  try {
    await writeFile(lockPath, "reporting", { flag: "wx" });
  } catch (e) {
    if (e.code === "EEXIST")
      throw new Error("Verification is running; wait before reporting");
    throw e;
  }
  try {
    const c = await contractAt(root, run),
      snap = await snapshot(root, c.scope),
      records = await readRecords(root, run);
    const rows = [];
    for (const r of c.criteria) {
      const items = records
        .filter((e) => e.criterion === r.id)
        .sort((a, b) => a.sequence - b.sequence);
      const latest = items.at(-1);
      let status = "unverified",
        reason = "No verification evidence";
      if (latest) {
        status = latest.status;
        reason = latest.reason || latest.note || "";
        if (
          !["passed", "failed", "stale", "blocked", "needs-review"].includes(
            status,
          )
        )
          throw new Error("Invalid evidence status");
        if (
          latest.root !== root ||
          latest.contractHash !== hash(json(c)) ||
          latest.snapshot !== snap.digest
        ) {
          status = "stale";
          reason = "Contract or scoped files changed since this evidence";
        }
        if (latest.kind === "observation" && status === "passed")
          status = "needs-review";
        if (latest.attachment) {
          try {
            if (
              hash(await readFile(await safe(root, latest.attachment.path))) !==
              latest.attachment.sha256
            ) {
              status = "stale";
              reason = "Observation attachment changed";
            }
          } catch {
            status = "stale";
            reason = "Observation attachment missing or unreadable";
          }
        }
        if (status === "passed" && r.origin === "derived") {
          status = "needs-review";
          reason =
            "Check passed, but this criterion was derived; confirm it represents the user requirement";
        }
      }
      rows.push({
        id: r.id,
        requirement: r.requirement,
        expected: r.expected,
        required: r.required,
        origin: r.origin,
        status,
        reason,
        evidenceId: latest?.id || null,
        historyCount: items.length,
      });
    }
    const required = rows.filter((r) => r.required);
    const verdict = required.some((r) => r.status === "failed")
      ? "not-complete"
      : required.every((r) => r.status === "passed")
        ? "verified-within-scope"
        : "incomplete-evidence";
    const limitations = [
      "Conclusion covers only the declared criteria and snapshot scope; host must check omitted requirements and semantic fit.",
      "Command exit 0 or text assertions do not prove untested behavior or document quality.",
      "Local evidence records are editable, not signed or tamper-proof. Runtime/external environments can change without a file change; rerun checks for those claims.",
    ];
    if (hash(json(await contractAt(root, run))) !== hash(json(c)))
      throw new Error("Contract changed during report; retry");
    if ((await snapshot(root, c.scope)).digest !== snap.digest)
      throw new Error("Scoped files changed during report; retry");
    const result = {
      schemaVersion: 1,
      run,
      task: c.task,
      source: c.source,
      scope: c.scope,
      snapshot: snap.digest,
      generatedAt: new Date().toISOString(),
      verdict,
      rows,
      limitations,
      next: rows
        .filter((r) => r.status !== "passed")
        .map((r) => ({
          id: r.id,
          action:
            r.status === "stale"
              ? "Recheck current snapshot"
              : r.status === "failed"
                ? "Fix the observed failure, then recheck"
                : r.status === "blocked"
                  ? "Provide missing environment/access"
                  : r.status === "needs-review"
                    ? "Review semantic evidence or confirm derived criterion"
                    : "Run the criterion check",
        })),
    };
    const labels = {
      passed: "已验证",
      failed: "未通过",
      stale: "证据已过期",
      blocked: "环境受限",
      unverified: "尚未验证",
      "needs-review": "待复核",
      "verified-within-scope": "声明范围内的必要自动检查已通过",
      "not-complete": "尚未完成：存在必要项失败",
      "incomplete-evidence": "证据不足：尚不能确认完成",
    };
    result.markdown = `# 交付验收报告\n\n任务：${esc(c.task)}\n\n需求来源：${esc(c.source)}\n\n结论：${labels[verdict]}\n\n检查范围：${c.scope.map(esc).join("、")}\n\n生成时间：${result.generatedAt}\n\n| 验收项 | 预期结果 | 必须 | 状态 | 依据或缺口 | 证据 |\n| --- | --- | --- | --- | --- | --- |\n${rows.map((r) => `| ${esc(r.id + ": " + r.requirement)} | ${esc(r.expected)} | ${r.required ? "是" : "否"} | ${labels[r.status]} | ${esc(r.reason)} | ${r.evidenceId ? `[记录](../evidence/${r.evidenceId}.json)` : "无"} |`).join("\n")}\n\n## 下一步\n\n${result.next.map((x) => "- " + esc(x.id + ": " + x.action)).join("\n") || "声明范围内的必要检查已通过；当前 Agent 仍须核对需求覆盖和证据是否适用，再说明完成范围。"}\n\n## 验证边界\n\n- 结论仅覆盖声明的验收项和文件范围；未纳入的需求不能算作已验证。\n- 命令退出成功、文件存在或文字匹配，不证明未测试的行为或文档质量。\n- 本地证据可被编辑，不是防篡改认证；远程环境变化不在文件摘要的检测范围内。\n`;
    return result;
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  }
}
export async function exportReport(options) {
  const result = await report(options);
  const root = await rootPath(options.root),
    name = "report-" + randomUUID(),
    dir = await safe(root, `${store(options.run)}/${name}`);
  await mkdir(dir);
  await writeFile(path.join(dir, "report.json"), json(result), {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(path.join(dir, "report.md"), result.markdown, {
    flag: "wx",
    mode: 0o600,
  });
  return {
    ...result,
    files: {
      json: path.join(dir, "report.json"),
      markdown: path.join(dir, "report.md"),
    },
  };
}
