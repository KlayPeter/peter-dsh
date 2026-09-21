import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, access, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { start, inspect, runChecks, report } from "../src/index.js";
async function temp(t) {
  const root = await mkdtemp(path.join(tmpdir(), "peter-batch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "app.txt"), "ready");
  return root;
}
const c = (criteria) => ({
  schemaVersion: 1,
  task: "Verify delivery",
  source: "User requested ready artifact",
  scope: ["app.txt"],
  criteria,
});
const criterion = (id, extra = {}) => ({
  id,
  requirement: id,
  expected: "ready",
  origin: "user",
  required: true,
  method: "artifact",
  artifact: "app.txt",
  contains: "ready",
  ...extra,
});
test("batch executes explicit checks, returns concise gaps and exports evidence", async (t) => {
  const root = await temp(t);
  const plan = await start({
    root,
    contract: c([criterion("C1"), criterion("C2", { method: "manual" })]),
  });
  const r = await runChecks({
    root,
    run: plan.run,
    criteria: ["C1"],
    contractHash: plan.contractHash,
    export: true,
  });
  assert.equal(r.verdict, "incomplete-evidence");
  assert.equal(r.overview.required.passed, 1);
  assert.equal(r.overview.gaps[0].id, "C2");
  assert.ok(await readFile(r.files.markdown, "utf8"));
  assert.equal(
    (await inspect({ root, run: plan.run })).contractHash,
    plan.contractHash,
  );
});
test("invalid whole selection or changed contract executes nothing", async (t) => {
  const root = await temp(t);
  const marker = path.join(root, "MUST_NOT_EXIST");
  const plan = await start({
    root,
    contract: c([
      criterion("C1", {
        method: "command",
        command: {
          file: process.execPath,
          args: [
            "-e",
            `require('fs').writeFileSync(${JSON.stringify(marker)},'bad')`,
          ],
        },
      }),
      criterion("C2", { method: "manual" }),
    ]),
  });
  for (const ids of [
    ["C1", "C2"],
    ["C1", "UNKNOWN"],
    ["C1", "C1"],
  ])
    await assert.rejects(
      runChecks({
        root,
        run: plan.run,
        criteria: ids,
        contractHash: plan.contractHash,
      }),
    );
  await assert.rejects(
    runChecks({
      root,
      run: plan.run,
      criteria: ["C1"],
      contractHash: "0".repeat(64),
    }),
    /changed/,
  );
  await assert.rejects(access(marker));
});
test("batch failure and subsequent file changes remain visible", async (t) => {
  const root = await temp(t);
  const plan = await start({
    root,
    contract: c([criterion("C1"), criterion("C2", { contains: "missing" })]),
  });
  const r = await runChecks({
    root,
    run: plan.run,
    criteria: ["C1", "C2"],
    contractHash: plan.contractHash,
  });
  assert.equal(r.verdict, "not-complete");
  assert.equal(r.overview.required.failed, 1);
  await writeFile(path.join(root, "app.txt"), "ready changed");
  const stale = await report({ root, run: plan.run });
  assert.ok(stale.overview.gaps.every((r) => r.status === "stale"));
});
test("contract mutated during first command prevents the next command", async (t) => {
  const root = await temp(t);
  const sentinel = path.join(root, "SECOND");
  const plan = await start({
    root,
    contract: c([
      criterion("C1", {
        method: "command",
        command: {
          file: process.execPath,
          args: [
            "-e",
            `const f=require('fs');const p='.delivery-acceptance/'+f.readdirSync('.delivery-acceptance')[0]+'/contract.json';const c=JSON.parse(f.readFileSync(p));c.task='changed';f.writeFileSync(p,JSON.stringify(c));`,
          ],
        },
      }),
      criterion("C2", {
        method: "command",
        command: {
          file: process.execPath,
          args: [
            "-e",
            `require('fs').writeFileSync(${JSON.stringify(sentinel)},'bad')`,
          ],
        },
      }),
    ]),
  });
  await assert.rejects(
    runChecks({
      root,
      run: plan.run,
      criteria: ["C1", "C2"],
      contractHash: plan.contractHash,
    }),
    /changed/,
  );
  await assert.rejects(access(sentinel));
});
