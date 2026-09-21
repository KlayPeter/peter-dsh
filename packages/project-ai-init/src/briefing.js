import { readText, hash } from './files.js';

export const sourcePriority = f => f === "README.md" ? 0 : f === "docs/features/README.md" ? 1 : /(^|\/)(AGENTS|CLAUDE)[^/]*\.md$/.test(f) ? 2 : f.startsWith(".github/workflows/") ? 3 : f.endsWith("README.md") ? 4 : 5;
const primary = /^(dev|start|test|test:unit|lint|typecheck|check|build)$/;
const esc = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('`', "'");
export function projectBriefing(scan) {
  const commands = scan.packages.flatMap(p => p.commands.filter(c => primary.test(c.name)).map(c => ({ ...c, directory: p.directory })));
  const cautions = [];
  if (new Set(scan.packages.map(p => p.manager).filter(Boolean)).size > 1)
    cautions.push('各子项目使用不同包管理器；在表中指定的目录执行命令，不要在根目录统一安装或换锁文件。');
  for (const p of scan.packages) {
    if (!p.manager) cautions.push(`${p.directory} 的包管理器未确定，先核对 manifest、锁文件和 CI。`);
    if (!p.scripts.some(s => /^test(?::|$)/.test(s))) cautions.push(`${p.directory} 未声明 test 脚本；不要假定存在测试入口。`);
  }
  const entrypoints = [...new Set([
    ...scan.instructions.filter(f => !['AGENTS.md', 'CLAUDE.md'].includes(f)),
    ...scan.docs.filter(f => f.endsWith("README.md") || (!scan.docs.includes("docs/features/README.md") && f.endsWith("FEATURE.md"))),
    ...scan.files.filter(f => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)),
  ])].sort((a, b) => sourcePriority(a) - sourcePriority(b) || a.localeCompare(b));
  return { commands, cautions, entrypoints, limitations: ['脚本来自 manifest，尚未执行；脚本名不代表安全或测试有效。', '架构与改动联动需要 Agent 阅读相关代码后提炼，扫描器不推断业务关系。'] };
}

// Facts are host-authored interpretations, with locally checked source versions.
// Hashes detect outdated evidence; they do not certify the interpretation.
export async function resolveFacts(root, input = [], { previous = false } = {}) {
  if (!Array.isArray(input) || input.length > 12) throw new Error('projectFacts must contain at most 12 evidence-backed notes.');
  const facts = [], active = [], stale = [], guards = {};
  for (const fact of input) {
    if (!fact || typeof fact.text !== 'string' || !fact.text.trim() || fact.text.length > 600 || fact.text.includes('peter-ai:') || !Array.isArray(fact.sources) || !fact.sources.length || fact.sources.length > 5) throw new Error('Each project fact needs text and 1–5 source paths.');
    const sources = [];
    let outdated = false;
    for (const item of fact.sources) {
      const file = previous ? item?.path : item;
      if (typeof file !== 'string' || /(^|\/)(\.env[^/]*|\.ai-init|\.agent-context|node_modules|\.git)(\/|$)/.test(file) || /(^|\/)(AGENTS[^/]*|CLAUDE[^/]*)\.md$/.test(file)) throw new Error('Use project code/docs as fact sources, not secrets or generated instructions.');
      const text = await readText(root, file);
      const digest = text === null ? null : hash(text);
      if (!previous && digest === null) throw new Error('Fact source does not exist: ' + file);
      if (previous && !/^[a-f0-9]{64}$/.test(item.sha256 || '')) throw new Error('Invalid saved fact source hash.');
      guards[file] = digest;
      if (previous && digest !== item.sha256) outdated = true;
      sources.push({ path: file, sha256: previous ? item.sha256 : digest });
    }
    const saved = { text: fact.text.trim(), sources };
    facts.push(saved);
    (outdated ? stale : active).push(saved);
  }
  return { facts, active, stale, guards };
}

export function factSections(facts) {
  const sections = [];
  if (facts.active.length) sections.push('### 项目关系与改动提醒\n\n以下由 Agent 阅读后提炼，来源版本已记录；不是程序独立证明。\n\n' + facts.active.map(f => `- ${esc(f.text)}（来源：${f.sources.map(s => '`' + esc(s.path) + '`').join('、')}）`).join('\n'));
  if (facts.stale.length) sections.push('### 需要重新核实\n\n' + facts.stale.map(f => `- 来源已变，暂不沿用：${esc(f.text)}。重新阅读 ${f.sources.map(s => '`' + esc(s.path) + '`').join('、')}。`).join('\n'));
  return sections;
}

export function compactInstructions(scan, config, facts) {
  const b = projectBriefing(scan), sections = [];
  sections.push('## 项目开发速查\n\n已有手写规则和当前用户要求优先。以下命令为文件声明，尚未执行。');
  const shown = b.commands.slice(0, 12);
  if (shown.length) sections.push('### 常用命令\n\n| 目录 | 命令 | 来源 |\n| --- | --- | --- |\n' + shown.map(c => `| \`${esc(c.directory)}\` | \`${esc(c.command)}\` | \`${esc(c.source)}\` |`).join('\n'));
  if (b.commands.length > shown.length) sections.push('其他脚本按任务查看对应 package.json；本表只保留前 12 个常用入口。');
  if (b.cautions.length) sections.push('### 先避开这些坑\n\n' + b.cautions.slice(0, 8).map(s => '- ' + esc(s)).join('\n'));
  sections.push(...factSections(facts));
  if (b.entrypoints.length) sections.push('### 按任务阅读\n\n' + b.entrypoints.slice(0, 8).map(f => '- `' + esc(f) + '`').join('\n'));
  const rules = [...new Set([...(config.projectRules || []), ...config.preset.rules])];
  if (rules.length) sections.push('### 工作约定\n\n' + rules.map(r => '- ' + r).join('\n'));
  if (config.preset.featureDocs) sections.push('功能文档沿用现有索引；仅在实际功能需要时补充 FEATURE.md 和内联 Mermaid，不预先铺设空文档。');
  if (config.preset.tools.length) sections.push('所选偏好需要的工具：' + config.preset.tools.join('、') + '。安装、连接和实际调用需分别验证。');
  if (!shown.length) sections.push('尚未确认可运行的常用命令；先查看 README / CI，不能编造 npm test。');
  return sections.join('\n\n') + '\n';
}
