export const starterNames = [
  "auto",
  "none",
  "node-cli",
  "python-cli",
  "static-web",
  "docs",
];
export function chooseStarter(request, selected = "auto") {
  if (!starterNames.includes(selected))
    throw new Error(`Unknown starter: ${selected}`);
  if (selected !== "auto")
    return { starter: selected, reason: "Explicit starter selection." };
  // Only recognize narrow, positive descriptions. The host Agent resolves semantics.
  if (/(不要|不用|不是|别用|迁移|改用|not\b|without\b|instead)/i.test(request))
    return {
      starter: null,
      reason:
        "Request contains alternatives or exclusions; the Agent must choose explicitly.",
    };
  const matches = [];
  if (/(node\.?js|node)/i.test(request) && /(cli|命令行)/i.test(request))
    matches.push("node-cli");
  if (/python/i.test(request) && /(cli|命令行)/i.test(request))
    matches.push("python-cli");
  if (/(纯静态|静态网页|static (web|site)|纯\s*html)/i.test(request))
    matches.push("static-web");
  if (/(文档仓库|知识库文档|documentation (repo|site))/i.test(request))
    matches.push("docs");
  return matches.length === 1
    ? {
        starter: matches[0],
        reason:
          "A single supported starter was explicitly indicated by the request.",
      }
    : {
        starter: null,
        reason:
          "Project purpose does not uniquely determine a supported stack.",
      };
}
const feature = `# 首个功能\n\n当前只是工程骨架。根据 docs/PROJECT_BRIEF.md 实现具体业务后，再把目标、流程、失败路径、代码与测试地图写在对应 Owner 的 FEATURE.md，并加入 docs/features/README.md。\n`;
export function starterFiles(kind) {
  if (kind === "none") return {};
  if (kind === "node-cli")
    return {
      "package.json":
        JSON.stringify(
          {
            name: "my-cli",
            version: "0.1.0",
            private: true,
            type: "module",
            packageManager: "npm@10.9.8",
            engines: { node: ">=22" },
            scripts: { start: "node src/cli.js", test: "node --test" },
          },
          null,
          2,
        ) + "\n",
      "src/cli.js": `import { pathToFileURL } from 'node:url';\nexport function run(args = []) {\n  if (args.length === 0 || args.includes('--help')) return 'Usage: npm start -- [--help]\\nProject scaffold; implement your command here.';\n  throw new Error('Unknown argument: ' + args[0]);\n}\nif (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {\n  try { console.log(run(process.argv.slice(2))); }\n  catch (error) { console.error(error.message); process.exitCode = 1; }\n}\n`,
      "test/cli.test.js": `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { run } from '../src/cli.js';\ntest('help documents invocation and invalid args fail', () => {\n  assert.match(run(['--help']), /Usage:/);\n  assert.throws(() => run(['--unknown']), /Unknown argument/);\n});\n`,
      "src/FEATURE.md": feature,
    };
  if (kind === "python-cli")
    return {
      "main.py": `import argparse\n\ndef build_parser():\n    parser = argparse.ArgumentParser(description="Project scaffold; implement your command here.")\n    parser.add_argument("--version", action="version", version="0.1.0")\n    return parser\n\nif __name__ == "__main__":\n    build_parser().parse_args()\n`,
      "tests/test_cli.py": `import unittest\nfrom main import build_parser\n\nclass CliTests(unittest.TestCase):\n    def test_no_args(self):\n        self.assertEqual(vars(build_parser().parse_args([])), {})\n    def test_unknown_arg(self):\n        with self.assertRaises(SystemExit) as result:\n            build_parser().parse_args(["--unknown"])\n        self.assertEqual(result.exception.code, 2)\n`,
      "FEATURE.md": feature,
    };
  if (kind === "static-web")
    return {
      "index.html":
        '<!doctype html>\n<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>项目起点</title><link rel="stylesheet" href="styles.css"><main><h1>项目起点</h1><p>这是可打开的静态网页骨架。具体内容与交互依据项目需求继续实现。</p></main></html>\n',
      "styles.css":
        "body{margin:0;background:#f5f5f2;color:#202a32;font:18px/1.7 system-ui,sans-serif}main{max-width:800px;margin:12vh auto;padding:32px}h1{font-size:2.5rem}\n",
      "FEATURE.md": feature,
    };
  if (kind === "docs")
    return {
      "docs/index.md":
        "# 文档入口\n\n从 PROJECT_BRIEF.md 的目标开始组织材料。新增内容在这里添加相对链接，来源事实与个人分析分开。\n",
    };
  throw new Error(`No starter implementation: ${kind}`);
}
