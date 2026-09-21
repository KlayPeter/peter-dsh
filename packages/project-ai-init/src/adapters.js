import { projectBriefing } from './briefing.js';

export const projectCheckPaths = [
  '.agents/skills/project-check/SKILL.md',
  '.claude/skills/project-check/SKILL.md',
];
export function adapterFiles(targets, projectCheck) {
  const files = [];
  if (projectCheck && targets.some(t => ['codex', 'dsh'].includes(t))) files.push(projectCheckPaths[0]);
  if (projectCheck && targets.includes('claude')) files.push(projectCheckPaths[1]);
  return files;
}
export function adapterSummary(targets, projectCheck) {
  return targets.map(target => ({
    target,
    instructions: target === 'claude' ? 'CLAUDE.md → AGENTS.md' : 'AGENTS.md',
    skill: adapterFiles([target], projectCheck)[0] || null,
    status: 'configured-not-runtime-verified',
  }));
}
const safe = s => String(s).replaceAll('`', "'").replaceAll('|', '\\|').replaceAll('\n', ' ');
export function projectCheckSkill(scan) {
  const checks = projectBriefing(scan).commands.filter(c => /^(test|test:unit|lint|typecheck|check|build)$/.test(c.name)).slice(0, 16);
  const index = scan.docs.includes('docs/features/README.md') ? 'docs/features/README.md' : null;
  return `---
name: project-check
description: 对当前项目的代码改动做交付前检查，沿真实命令和功能文档核实测试、接口与文档影响；适用于修改后自检或提交前验证。
---

# 当前项目的改动检查

先读取项目根 AGENTS.md 和改动目录内的规则。所有下方路径相对项目根；Skill 所在目录不是命令工作目录。若当前位于子目录，先确定项目根。

1. 对照用户本次需求和实际 diff，定位改动入口、调用方、接口类型、持久化格式及关联测试。只检查真实相关项，不创建一套空的通用清单；已有工作区改动保留，不把别人的改动算成本次交付。
2. ${index ? `沿 ${index} 的代码路径映射读取受影响 FEATURE.md；` : '沿项目现有 README / 功能文档找对应验证说明；'}行为、契约或流程变化同步相关文档。Mermaid 内联；没有文档体系时，只给当前功能补必要说明，不批量建文档。
3. 下表是扫描时发现的候选命令，**未执行，也不是安全白名单**。先重读对应 manifest、pre/post 脚本和 CI，确认命令尚存在且适用于本次改动，再用宿主执行最小充分检查。watch/dev/server、部署、数据库迁移不作为自动检查；设置合理超时，停止无进展的命令。缺依赖或凭据则明确缺口。
4. 检查最相关的失败或边界路径。输出命令、执行目录和实际退出结果；只有文件存在、测试脚本为空或没有断言，都不能当作功能已验证。
5. 若项目是 Git 仓库，检查 git diff --check；它只检查补丁空白错误。报告已验证、未验证、需人工决定三类结果。仅在本次授权包含提交时 commit，推送与发布不由本 Skill 自动授权。

## 当前候选检查

${checks.length ? '| 工作目录 | 命令 | 来源 |\n| --- | --- | --- |\n' + checks.map(c => `| \`${safe(c.directory)}\` | \`${safe(c.command)}\` | \`${safe(c.source)}\` |`).join('\n') : '尚无已确认的常用检查脚本；阅读 README / CI 和现有测试，不能编造 npm test。'}

不要把本次通过写成永远有效的项目规则。长期项目关系更新到 AI Init 的 projectFacts，并提供实际来源；个人偏好另存 preset。脚本变动后 sync 更新本 Skill。
`;
}
