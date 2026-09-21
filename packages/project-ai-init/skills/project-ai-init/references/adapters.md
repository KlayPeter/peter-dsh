# Codex / Claude / dsh 适配

共用项目事实和偏好，按宿主入口加载，不把日常规则复制成三份。

| 目标 | 规则入口 | Peter 的 project-check Skill |
| --- | --- | --- |
| Codex | AGENTS.md | .agents/skills/project-check/SKILL.md |
| Claude Code | CLAUDE.md 导入 @AGENTS.md | .claude/skills/project-check/SKILL.md |
| dsh | AGENTS.md，需要启用对应指令 provider | .agents/skills/project-check/SKILL.md，需要 filesystem Skill provider |

Codex 和 dsh 同时选择时，只生成一份共享 Skill。Claude 的原生目录另外生成相同内容，由同一配置源更新。已有文件不接管、手改不覆盖、移除 target 只清理本工具管理且未改过的文件。已有同名 Skill 应先由宿主核对，不能为了安装而覆盖。

project-check 在用户要求改动后检查或提交前验证时使用，按当前项目真实脚本和功能文档做最小充分检查。命令表不是自动执行白名单；先重读脚本、生命周期钩子和本次授权。它不自动改宿主权限、模型、全局设置或提交 Hooks。

项目代码更新后 sync 会更新候选命令。用户不需要这个工作流时，保留 minimal 或在个人模板设 projectCheck=false。它与本插件自己的 project-ai-init Skill 不同：前者负责当前项目自检，后者负责创建和更新配置。

规则只作用于其目录范围。例如后端 CLAUDE.md 使用 Bun，不能因此把前端 pnpm/Vite 换掉。其他宿主不一定自动读取 CLAUDE.md：由根 AGENTS.md 的阅读入口引导，再核实实际作用范围。不要把 Claude 的 @ 导入语法当成通用 Markdown。

生成后分别确认 Skill 列表和规则入口；文件存在只说明已配置，不证明模型正确执行。Codex 可请求使用 $project-check；Claude 可用 /project-check；dsh 可直接说“使用 project-check 检查这次改动”。未发现时刷新会话并检查项目根、目录和 provider。

依据：[Codex 官方自定义说明](https://learn.chatgpt.com/docs/customization/overview)、[Claude Code 官方 Skill 说明](https://code.claude.com/docs/en/skills)。dsh 路径依据本地已验证的 @deepseek-ai/dsh-skill-filesystem 0.1.0-rc.6 的默认 project-agents 根目录。
