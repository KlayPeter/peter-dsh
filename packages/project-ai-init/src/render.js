import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { json } from "./files.js";
import { compactInstructions, factSections } from "./briefing.js";
import { adapterFiles, projectCheckSkill } from "./adapters.js";
import { starterFiles } from "./starters.js";
export const skillRoot = fileURLToPath(
  new URL("../skills/project-ai-init/", import.meta.url),
);
export async function loadPreset(value = "peter") {
  const preset =
    typeof value === "object" && value
      ? value
      : JSON.parse(
          await readFile(
            new URL(
              `../presets/${
                ["peter", "minimal"].includes(value)
                  ? value
                  : (() => {
                      throw new Error(
                        "Preset must be peter, minimal, or a custom preset object.",
                      );
                    })()
              }.json`,
              import.meta.url,
            ),
            "utf8",
          ),
        );
  if (
    !/^[a-z0-9-]{1,64}$/.test(preset.id || "") ||
    !Array.isArray(preset.rules) ||
    preset.rules.length > 40 ||
    preset.rules.some(
      (s) =>
        typeof s !== "string" ||
        s.length > 2000 ||
        s.includes("<!-- peter-ai:"),
    )
  )
    throw new Error("Invalid preset: provide id and up to 40 plain rules.");
  if (
    preset.tools !== undefined &&
    (!Array.isArray(preset.tools) ||
      preset.tools.length > 20 ||
      preset.tools.some(
        (x) => typeof x !== "string" || !/^[a-zA-Z0-9_.-]{1,64}$/.test(x),
      ))
  )
    throw new Error("Invalid preset tools: use tool identifiers.");
  if (preset.projectCheck !== undefined && typeof preset.projectCheck !== "boolean") throw new Error("projectCheck must be boolean.");
  return {
    projectCheck: preset.projectCheck === true,
    tools: [...new Set(preset.tools || [])],
    id: preset.id,
    description: String(preset.description || ""),
    rules: preset.rules,
    featureDocs: Boolean(preset.featureDocs),
  };
}
export async function getGuide({ mode = "existing" } = {}) {
  if (!["empty", "existing"].includes(mode))
    throw new Error("Guide mode must be empty or existing.");
  const entry = (await readFile(new URL("../skills/project-ai-init/SKILL.md", import.meta.url), "utf8")).replace(/^---\n[\s\S]*?\n---\n/, "");
  const refs = ["shared", mode];
  return entry + "\n\n" + (
    await Promise.all(
      refs.map((f) =>
        readFile(
          new URL(
            `../skills/project-ai-init/references/${f}.md`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    )
  ).join("\n\n");
}
const esc = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
export function renderFiles(scan, config, firstRun, facts = { active: [], stale: [] }) {
  const { request, preset, targets, starter } = config;
  const files = {};
  const add = (path, content, kind = "managed") => {
    files[path] = { content, kind };
  };
  const commandRows = scan.packages.flatMap((p) =>
    p.commands.map(
      (c) =>
        `| \`${esc(p.directory)}\` | \`${esc(c.command)}\` | \`${esc(c.source)}\` | 未执行 |`,
    ),
  );
  const projectText = `# 项目事实\n\n这些信息来自文件扫描；检查到脚本不代表运行通过。\n\n- 技术栈：${scan.languages.join("、") || "尚未从已有文件确定"}\n- 配置前状态：${scan.mode}\n- 原有指令：${
    scan.instructions
      .filter((f) => !["AGENTS.md", "CLAUDE.md"].includes(f))
      .map((f) => "`" + f + "`")
      .join("、") || "无子目录指令"
  }\n\n## 可用脚本\n\n${commandRows.length ? "| 工作目录 | 命令 | 来源 | 验证 |\n| --- | --- | --- | --- |\n" + commandRows.join("\n") : "未从 package.json 确认可运行脚本。请从项目文档与实际任务配置继续核实，不猜测测试命令。"}\n\n## 已有文档\n\n${
    scan.docs
      .slice(0, 30)
      .map((f) => "- `" + f + "`")
      .join("\n") || "未发现 README.md 或 FEATURE.md。"
  }\n\n## 已有 Skill\n\n${scan.skills.map((f) => "- `" + f + "`").join("\n") || "未发现项目级 Skill。"}\n\n## 扫描提示\n\n${scan.warnings.map((f) => "- " + f).join("\n") || "无。"}\n`;
  if (config.layout === "expanded") {
  add(".agent-context/project.md", projectText + "\n" + factSections(facts).join("\n\n"));
  add(
    ".agent-context/workflow.md",
    `# 工作偏好：${preset.id}\n\n${preset.description}\n\n当前用户要求与项目已有规则优先；本文件只补充未约定的部分。下列规则不授权任意推送、发布或外部操作。\n\n${preset.rules.map((s) => "- " + s).join("\n")}\n\n## 当前项目调整\n\n以下项目约定优先于上面的通用偏好，仅作用于本项目。\n\n${(config.projectRules || []).map((s) => "- " + s).join("\n") || "暂无；按实际项目补充，不修改可复用模板。"}\n\n## 需要的工具\n\n${preset.tools.join("、") || "无显式工具依赖"}。安装与连接状态需实际验证，不能由本文件证明已可用。\n`,
  );
  add(
    "AGENTS.md",
    `## 项目 AI 工作入口\n\n当前用户要求和项目已有规则优先；以下是本工具补充的工作入口。先读取 [项目事实](.agent-context/project.md) 与 [工作偏好](.agent-context/workflow.md)，再按当前任务读取相关功能文档。\n\n- 任务目标以当前用户描述为准；历史初始化目标见 [.ai-init/config.json](.ai-init/config.json)，不是每次会话都要继续执行的任务。\n- 发现事实与偏好冲突时保留已有规则，说明具体矛盾后再调整。\n- 脚本是否存在与是否验证通过分开记录；初始化不会执行项目脚本。\n${preset.featureDocs ? "- 功能文档先查项目既有索引；需要新建时参考 [功能文档指南](.agent-context/feature-docs.md)。\n" : ""}`,
    "block",
  );
  if (preset.featureDocs)
    add(
      ".agent-context/feature-docs.md",
      "# 功能文档维护\n\n优先使用项目现有功能索引和模板。没有既有约定时，在 docs/features/README.md 维护索引，在功能代码的主 Owner 目录维护 FEATURE.md。小项目可以只有一张功能卡。\n\n功能卡包含：目标与非目标、入口、实现流程、失败路径、代码地图、验证方式。流程或交互变化用内联 Mermaid 表达。不存在的数据、路径或测试不能写成已实现。功能文档与代码一起维护，不把业务介绍塞进 AGENTS.md。\n",
    );
  } else {
    add("AGENTS.md", compactInstructions(scan, config, facts), "block");
  }
  for (const file of adapterFiles(targets, preset.projectCheck)) add(file, projectCheckSkill(scan));
  if (targets.includes("claude")) add("CLAUDE.md", "@AGENTS.md\n", "block");
  if (firstRun && scan.mode === "empty" && starter !== "none") {
    for (const [file, content] of Object.entries(starterFiles(starter))) {
      if (!preset.featureDocs && file.endsWith("FEATURE.md")) continue;
      add(file, content, "seed");
    }
    add(
      "README.md",
      `# 新项目\n\n项目目标与范围见 [项目简述](docs/PROJECT_BRIEF.md)。当前交付为 ${starter} 工程骨架，业务能力尚待实现。\n\n${starter === "node-cli" ? "需要 Node.js 22+。\n\n```sh\nnpm test\nnpm start -- --help\n```" : starter === "python-cli" ? "需要 Python 3。\n\n```sh\npython3 main.py --help\npython3 -m unittest discover -s tests\n```" : starter === "static-web" ? "直接用浏览器打开 index.html。当前没有自动测试命令。" : "从 [文档入口](docs/index.md) 开始。"}\n\n生成骨架时没有执行上述命令，需在当前环境运行后再记录结果。\n`,
      "seed",
    );
    add(
      "docs/PROJECT_BRIEF.md",
      "# 项目简述\n\n## 用户的初始需求\n\n" +
        request +
        "\n\n## 当前阶段\n\n基础骨架与 Agent 配置已建立；下一步将需求拆成可验证的功能，再实现业务。未指定的技术与产品决策不视为已经确定。\n",
      "seed",
    );
    if (preset.featureDocs)
      add(
        "docs/features/README.md",
        "# 功能索引\n\n按实际功能填写 Owner 目录的 FEATURE.md 链接。当前只有骨架，不把计划当成已交付能力。\n",
        "seed",
      );
  }
  add(
    ".gitignore",
    ".ai-init/lock\n.ai-init/tooling.lock\n.ai-init/runtime/\n.ai-init/codegraph.dsh.json\n.codegraph/\nnode_modules/\n__pycache__/\n.venv/\n.env\n.env.*\n!.env.example\n",
    "block",
  );
  // This editable source is intentionally not managed by sync's content hash.
  add(".ai-init/config.json", json(config), "config");
  return files;
}
