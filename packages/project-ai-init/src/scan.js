import { rootPath, readText, readdir, hash, json } from "./files.js";
import path from "node:path";
const skip = new Set([
  ".git",
  "node_modules",
  "vendor",
  ".qa",
  ".ai-init",
  ".agent-context",
  "dist",
  "build",
  "output",
  "outputs",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  ".cache",
  ".data",
  ".firecrawl",
  ".codegraph",
  ".tmp",
]);
const locks = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
};
const instructionNames = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "AGENTS.local.md",
  "CLAUDE.local.md",
  "AGENTS.override.md",
]);
export async function inspectProject(root) {
  root = await rootPath(root);
  const files = [],
    warnings = [];
  let count = 0;
  async function walk(dir = "", depth = 0) {
    const entries = (
      await readdir(path.join(root, dir), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (++count > 8000)
        throw new Error(
          "Project scan exceeds 8,000 entries; choose a narrower project root.",
        );
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isSymbolicLink()) {
        warnings.push(`Skipped symlink: ${rel}`);
        continue;
      }
      if (e.isDirectory()) {
        if (
          skip.has(e.name) ||
          rel === ".agents/skills" ||
          rel === ".dsh/skills" ||
          rel === ".claude/skills"
        )
          continue;
        if (depth >= 8)
          throw new Error(
            `Project scan depth exceeded at ${rel}; choose a narrower root.`,
          );
        await walk(rel, depth + 1);
      } else if (
        e.isFile() &&
        !e.name.startsWith(".env") &&
        ![".DS_Store"].includes(e.name)
      )
        files.push(rel);
    }
  }
  await walk();
  const evidence = {},
    packages = [],
    languages = new Set();
  const read = async (rel) => {
    const text = await readText(root, rel);
    evidence[rel] = hash(text);
    return text;
  };
  for (const rel of files) {
    const name = path.posix.basename(rel),
      dir = path.posix.dirname(rel);
    if (name === "package.json") {
      let pkg;
      try {
        pkg = JSON.parse(await read(rel));
      } catch (e) {
        throw new Error(`Invalid ${rel}: ${e.message}`);
      }
      let manager = null;
      let managerSource = null;
      for (let scope = dir; ; scope = path.posix.dirname(scope)) {
        const manifest =
          scope === "." ? "package.json" : `${scope}/package.json`;
        const scopedPkg =
          scope === dir
            ? pkg
            : files.includes(manifest)
              ? JSON.parse(await read(manifest))
              : {};
        const nearby = Object.keys(locks).filter((f) =>
          files.includes(scope === "." ? f : `${scope}/${f}`),
        );
        const declared = /^(npm|pnpm|yarn|bun)@/.exec(
          scopedPkg.packageManager || "",
        )?.[1];
        const choices = [...new Set(nearby.map((f) => locks[f]))];
        if (
          choices.length > 1 ||
          (declared && choices.some((x) => x !== declared))
        ) {
          warnings.push(
            `Conflicting package managers in ${scope}; verify ${manifest} and lockfiles.`,
          );
          break;
        }
        if (declared || choices.length) {
          manager = declared || choices[0];
          managerSource = scope;
          break;
        }
        if (scope === ".") break;
      }
      if (!manager)
        warnings.push(
          `Package manager unknown in ${dir}; no runner command invented.`,
        );
      const names = Object.keys(pkg.scripts || {}).filter(
        (s) => /^[\w:.-]+$/.test(s) && typeof pkg.scripts[s] === "string",
      );
      const deps = [
        ...new Set([
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ]),
      ];
      packages.push({
        directory: dir,
        manifest: rel,
        manager,
        managerSource,
        scripts: names,
        commands: manager
          ? names.map((s) => ({
              name: s,
              command: `${manager} run ${s}`,
              source: `${rel}#scripts.${s}`,
              verified: false,
            }))
          : [],
        frameworks: deps.filter((d) =>
          [
            "react",
            "next",
            "vue",
            "vite",
            "express",
            "fastify",
            "elysia",
            "typescript",
            "@nestjs/core",
          ].includes(d),
        ),
      });
      languages.add("JavaScript/TypeScript");
    }
    if (
      [
        "pyproject.toml",
        "requirements.txt",
        "Cargo.toml",
        "go.mod",
        "pubspec.yaml",
        "Makefile",
      ].includes(name)
    )
      await read(rel);
    if (name === "pyproject.toml" || rel.endsWith(".py"))
      languages.add("Python");
    if (name === "Cargo.toml" || rel.endsWith(".rs")) languages.add("Rust");
    if (name === "go.mod" || rel.endsWith(".go")) languages.add("Go");
    if (name === "pubspec.yaml" || rel.endsWith(".dart"))
      languages.add("Dart/Flutter");
    if (instructionNames.has(name)) await read(rel);
  }
  const instructions = files.filter((f) =>
    instructionNames.has(path.posix.basename(f)),
  );
  const skillDirs = [];
  for (const folder of [".agents/skills", ".dsh/skills", ".claude/skills"]) {
    try {
      const entries = await readdir(path.join(root, folder), {
        withFileTypes: true,
      });
      for (const e of entries)
        if (e.isDirectory()) {
          const rel = `${folder}/${e.name}/SKILL.md`;
          if ((await readText(root, rel)) !== null) skillDirs.push(rel);
        }
    } catch (e) {
      if (e.code !== "ENOENT")
        warnings.push(
          `Skill directory not fully inspected: ${folder} (${e.message})`,
        );
    }
  }
  const substantive = files.filter(
    (f) =>
      ![".gitignore", "LICENSE", "LICENSE.md", ".gitattributes"].includes(f) &&
      !instructionNames.has(f) &&
      !f.startsWith(".claude/") &&
      !f.startsWith(".dsh/") &&
      !f.startsWith(".agents/"),
  );
  const mode = substantive.length ? "existing" : "empty";
  const result = {
    root,
    mode,
    files,
    languages: [...languages],
    packages,
    instructions,
    skills: skillDirs,
    docs: files.filter((f) => /(^|\/)(README|FEATURE)\.md$/.test(f)),
    warnings,
    evidence,
  };
  result.fingerprint = hash(json({ files, evidence, skills: skillDirs }));
  return result;
}
