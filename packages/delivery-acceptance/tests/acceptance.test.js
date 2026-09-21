import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  mkdir,
  symlink,
  realpath,
  access,
  cp,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  start,
  inspect,
  check,
  observe,
  report,
  exportReport,
  validateContract,
} from "../src/index.js";
async function temp(t) {
  const p = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "peter-accept-")),
  );
  t.after(() => rm(p, { recursive: true, force: true }));
  await writeFile(path.join(p, "app.js"), "export const answer=42;\n");
  return p;
}
const contract = (criteria, extra = {}) => ({
  schemaVersion: 1,
  task: "The CLI delivers the specified result",
  source: "User request in this task",
  scope: ["app.js"],
  criteria: criteria || [
    {
      id: "C1",
      requirement: "Result is correct",
      expected: "Prints 42 and exits 0",
      origin: "user",
      required: true,
      method: "command",
      command: { file: process.execPath, args: ["-e", "console.log(42)"] },
      stdoutIncludes: "42",
    },
  ],
  ...extra,
});
test("unexecuted checks never pass; real captured command and report work", async (t) => {
  const root = await temp(t),
    { run } = await start({ root, contract: contract() });
  assert.equal((await report({ root, run })).verdict, "incomplete-evidence");
  const e = await check({ root, run, criterion: "C1" });
  assert.equal(e.exitCode, 0);
  assert.match(e.stdout, /42/);
  assert.ok(e.files["app.js"]);
  const result = await exportReport({ root, run });
  assert.equal(result.verdict, "verified-within-scope");
  assert.equal(result.rows[0].historyCount, 1);
  assert.match(await readFile(result.files.markdown, "utf8"), /C1/);
  const another = await exportReport({ root, run });
  assert.notEqual(result.files.json, another.files.json);
});
test("nonzero exits, missing assertions, missing executable, timeout and output overflow fail", async (t) => {
  const root = await temp(t);
  for (const command of [
    { file: process.execPath, args: ["-e", "process.exit(7)"] },
    { file: process.execPath, args: ["-e", 'console.log("other")'] },
    { file: "definitely-no-such-peter-program", args: [] },
    {
      file: process.execPath,
      args: ["-e", "setInterval(()=>{},1000)"],
      timeoutMs: 20,
    },
    {
      file: process.execPath,
      args: ["-e", 'console.log("x".repeat(2*1024*1024))'],
    },
  ]) {
    const c = contract();
    c.criteria[0].command = command;
    const { run } = await start({ root, contract: c });
    assert.equal(
      (await check({ root, run, criterion: "C1" })).status,
      "failed",
    );
    assert.equal((await report({ root, run })).verdict, "not-complete");
  }
});
test("file and contract edits invalidate evidence, including dirty/untracked scope", async (t) => {
  const root = await temp(t),
    { run } = await start({ root, contract: contract() });
  await check({ root, run, criterion: "C1" });
  await writeFile(path.join(root, "app.js"), "changed");
  assert.equal((await report({ root, run })).rows[0].status, "stale");
  await check({ root, run, criterion: "C1" });
  assert.equal((await report({ root, run })).verdict, "verified-within-scope");
  const p = path.join(root, ".delivery-acceptance", run, "contract.json"),
    c = JSON.parse(await readFile(p, "utf8"));
  c.task = "Different task";
  await writeFile(p, JSON.stringify(c));
  assert.equal((await report({ root, run })).rows[0].status, "stale");
});
test("commands changing scoped files produce stale evidence; arguments are not shell-expanded", async (t) => {
  const root = await temp(t),
    c = contract();
  c.criteria[0].command.args = [
    "-e",
    'require("fs").writeFileSync("app.js","new"); console.log(42)',
  ];
  const { run } = await start({ root, contract: c });
  assert.equal((await check({ root, run, criterion: "C1" })).status, "stale");
  const literal = contract();
  literal.criteria[0].command.args = [
    "-e",
    "console.log(process.argv[1])",
    "$(touch PWNED)",
  ];
  literal.criteria[0].stdoutIncludes = "$(touch PWNED)";
  const second = await start({ root, contract: literal });
  assert.equal(
    (await check({ root, run: second.run, criterion: "C1" })).status,
    "passed",
  );
  await assert.rejects(access(path.join(root, "PWNED")));
});
test("manual pass cannot establish completion; blocked and failed remain distinct; latest wins", async (t) => {
  const root = await temp(t),
    c = contract();
  c.criteria[0].method = "manual";
  const { run } = await start({ root, contract: c });
  await assert.rejects(check({ root, run, criterion: "C1" }), /Manual/);
  for (const [outcome, expected] of [
    ["pass", "needs-review"],
    ["blocked", "blocked"],
    ["fail", "failed"],
  ]) {
    await observe({
      root,
      run,
      criterion: "C1",
      note: "Browser observation",
      outcome,
    });
    assert.equal((await report({ root, run })).rows[0].status, expected);
  }
  assert.equal((await report({ root, run })).rows[0].historyCount, 3);
});
test("latest failure overrides old command success; optional failures remain visible", async (t) => {
  const root = await temp(t),
    c = contract();
  c.criteria.push({
    ...c.criteria[0],
    id: "C2",
    required: false,
    command: { file: process.execPath, args: ["-e", "process.exit(1)"] },
  });
  const { run } = await start({ root, contract: c });
  await check({ root, run, criterion: "C1" });
  await check({ root, run, criterion: "C2" });
  assert.equal((await report({ root, run })).verdict, "verified-within-scope");
  await observe({
    root,
    run,
    criterion: "C1",
    note: "Actual user path failed",
    outcome: "fail",
  });
  assert.equal((await report({ root, run })).verdict, "not-complete");
});
test("artifact assertions are scoped; derived criteria need review; attachments can become stale", async (t) => {
  const root = await temp(t),
    c = contract([
      {
        id: "DOC",
        requirement: "Contains answer",
        expected: "Contains 42",
        origin: "derived",
        required: true,
        method: "artifact",
        artifact: "app.js",
        contains: "42",
      },
    ]);
  const { run } = await start({ root, contract: c });
  assert.equal((await check({ root, run, criterion: "DOC" })).status, "passed");
  assert.equal((await report({ root, run })).rows[0].status, "needs-review");
  await writeFile(path.join(root, "proof.txt"), "browser proof");
  await observe({
    root,
    run,
    criterion: "DOC",
    note: "Read the document",
    artifact: "proof.txt",
    outcome: "pass",
  });
  await writeFile(path.join(root, "proof.txt"), "modified");
  assert.equal((await report({ root, run })).rows[0].status, "stale");
});
test("evidence from another root cannot be silently reused", async (t) => {
  const root = await temp(t),
    other = await temp(t),
    { run } = await start({ root, contract: contract() });
  await check({ root, run, criterion: "C1" });
  await cp(
    path.join(root, ".delivery-acceptance"),
    path.join(other, ".delivery-acceptance"),
    { recursive: true },
  );
  assert.equal((await report({ root: other, run })).rows[0].status, "stale");
});
test("rejects unsafe scope, symlinks, duplicate IDs, empty required criteria and foreign paths", async (t) => {
  const root = await temp(t);
  for (const scope of [[], ["../outside"], [".delivery-acceptance"], ["/tmp"]])
    await assert.rejects(
      start({ root, contract: contract(undefined, { scope }) }),
    );
  await symlink(path.join(root, "app.js"), path.join(root, "link"));
  await assert.rejects(
    start({ root, contract: contract(undefined, { scope: ["link"] }) }),
    /Symlink/,
  );
  const c = contract();
  c.criteria.push(c.criteria[0]);
  assert.throws(() => validateContract(c), /Duplicate/);
  const optional = contract();
  optional.criteria[0].required = false;
  assert.throws(() => validateContract(optional), /required/);
  await assert.rejects(inspect({ root, run: "../bad" }));
});
test("runner lock blocks competing checks and releases after completion", async (t) => {
  const root = await temp(t),
    { run } = await start({ root, contract: contract() });
  const lock = path.join(root, ".delivery-acceptance", run, "lock");
  await writeFile(lock, "busy");
  await assert.rejects(check({ root, run, criterion: "C1" }), /EEXIST/);
  await assert.rejects(report({ root, run }), /running/);
  await rm(lock);
  await check({ root, run, criterion: "C1" });
  await assert.rejects(access(lock));
});
test("CLI roundtrip and exit codes; skill installation includes references without overwrite", async (t) => {
  const root = await temp(t),
    cli = fileURLToPath(new URL("../src/cli.js", import.meta.url)),
    spec = path.join(root, "acceptance.json");
  await writeFile(spec, JSON.stringify(contract()));
  const r = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "start", "--root", root, "--contract", spec],
      { encoding: "utf8" },
    ),
  );
  const args = [cli, "report", "--root", root, "--run", r.run];
  assert.equal(spawnSync(process.execPath, args).status, 2);
  execFileSync(process.execPath, [
    cli,
    "check",
    "--root",
    root,
    "--run",
    r.run,
    "--criterion",
    "C1",
  ]);
  assert.equal(spawnSync(process.execPath, args).status, 0);
  const dest = path.join(root, "skills");
  execFileSync(process.execPath, [cli, "install-skill", "--target", dest]);
  await access(path.join(dest, "delivery-acceptance/upstream/provenance.json"));
  assert.equal(
    spawnSync(process.execPath, [cli, "install-skill", "--target", dest])
      .status,
    1,
  );
});
test("pinned upstream snapshots and licenses are present", async () => {
  const vendor = new URL("../vendor/", import.meta.url),
    items = JSON.parse(
      await readFile(new URL("provenance.json", vendor), "utf8"),
    );
  assert.ok(items.some((x) => x.file.endsWith("LICENSE")));
  assert.ok(items.some((x) => x.file.endsWith("LICENSE.txt")));
  for (const item of items) {
    const bytes = await readFile(
      new URL(item.repository + "/" + item.file, vendor),
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});

test("directory additions and deleted artifacts are detected; malformed records fail closed", async (t) => {
  const root = await temp(t);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src/a.js"), "one");
  const c = contract(undefined, { scope: ["src"] });
  const { run } = await start({ root, contract: c });
  const record = await check({ root, run, criterion: "C1" });
  await writeFile(path.join(root, "src/b.js"), "two");
  assert.equal((await report({ root, run })).rows[0].status, "stale");
  const evidence = path.join(
    root,
    ".delivery-acceptance",
    run,
    "evidence",
    record.id + ".json",
  );
  await writeFile(evidence, JSON.stringify({ ...record, sequence: null }));
  await assert.rejects(report({ root, run }), /Invalid evidence/);
  const missing = contract(
    [
      {
        id: "FILE",
        requirement: "Artifact delivered",
        expected: "A nonempty file",
        required: true,
        origin: "user",
        method: "artifact",
        artifact: "missing.pdf",
      },
    ],
    { scope: ["missing.pdf"] },
  );
  const second = await start({ root, contract: missing });
  assert.equal(
    (await check({ root, run: second.run, criterion: "FILE" })).status,
    "failed",
  );
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  assert.equal(
    spawnSync(process.execPath, [
      cli,
      "report",
      "--root",
      root,
      "--run",
      second.run,
    ]).status,
    3,
  );
});
