import test from "node:test";
import assert from "node:assert/strict";
import { reviewMarkdown } from "../src/index.js";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("review catches numeric/source drift without claiming semantic verification", () => {
  const original =
    "# 说明\n\n最多 3 次；失败率可能为 5%。[来源](https://example.com/spec)";
  const result = reviewMarkdown("# 说明\n\n最多 5 次，失败率为 0%。", {
    original,
  });
  assert.equal(result.status, "needs-review");
  assert.deepEqual(result.comparison.removedNumbers, ["3", "5%"]);
  assert.ok(result.comparison.addedNumbers.includes("0%"));
  assert.deepEqual(result.comparison.removedSources, [
    "https://example.com/spec",
  ]);
  assert.match(result.limitation, /不理解含义/);
});
test("code numbers excluded, same prose unchanged, unfinished prose remains blocked", () => {
  const original = "# 说明\n\n数值为 3。\n\n```js\nconst x=8;\n```";
  const result = reviewMarkdown(
    "# 说明\n\n数值为 3。\n\n```js\nconst x=99;\n```",
    { original },
  );
  assert.equal(result.status, "checks-passed");
  assert.deepEqual(result.comparison.addedNumbers, []);
  assert.equal(reviewMarkdown("# 文档\n\nTODO").status, "blocked");
  assert.equal(reviewMarkdown("# 说明\n\n说明文本。").comparison, null);
});
test("review CLI reports review-needed as exit 2 and never changes source files", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "peter-review-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, "old.md"), "# Old\n\n3 次");
  await writeFile(path.join(dir, "new.md"), "# New\n\n4 次");
  const r = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../src/cli.js", import.meta.url)),
      "review",
      "--input",
      path.join(dir, "new.md"),
      "--original",
      path.join(dir, "old.md"),
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 2, r.stderr);
  assert.equal(JSON.parse(r.stdout).comparison.addedNumbers[0], "4");
  assert.equal(
    await readFile(path.join(dir, "old.md"), "utf8"),
    "# Old\n\n3 次",
  );
  assert.equal(
    await readFile(path.join(dir, "new.md"), "utf8"),
    "# New\n\n4 次",
  );
});
