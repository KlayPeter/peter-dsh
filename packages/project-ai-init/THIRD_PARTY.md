# 第三方 Skill 声明

原文与配套参考文件以固定版本保存，未修改，不会在安装时自动执行。中文适配在 skills/project-ai-init 内单独维护。

| 来源 | Skill | 提交 | 许可 |
| --- | --- | --- | --- |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | `create-agentsmd` | [4f4796f0bf30](https://github.com/github/awesome-copilot/tree/4f4796f0bf30e105700f97ed8408c12b6aa95e06) | [MIT](vendor/github/awesome-copilot/LICENSE) |
| [getsentry/skills](https://github.com/getsentry/skills) | `agents-md` | [c2f99a5b04b4](https://github.com/getsentry/skills/tree/c2f99a5b04b4cd992ec3022d7c2c3e23e938d241) | [Apache-2.0](vendor/getsentry/skills/LICENSE) |
| [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) | `agent-md-refactor` | [3027f20f3181](https://github.com/softaworks/agent-toolkit/tree/3027f20f3181758385a1bb8c022d4041dfb4de84) | [MIT](vendor/softaworks/agent-toolkit/LICENSE) |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | `claude-automation-recommender`, `claude-md-improver` | [c447c3207a42](https://github.com/anthropics/claude-plugins-official/tree/c447c3207a425bc4e2a0d068435f64b0477ae981) | [Apache-2.0](vendor/anthropics/claude-plugins-official/plugins/claude-code-setup/LICENSE) / [Apache-2.0](vendor/anthropics/claude-plugins-official/plugins/claude-md-management/LICENSE) |

逐文件 SHA-256 和来源见 [provenance.json](vendor/provenance.json)。根目录运行 `python3 scripts/vendor-project-ai-skills.py` 可恢复相同快照；脚本拒绝覆盖被修改的原文。

未引入 claude-settings-audit 的权限模板、sd0xdev 的提交 Hooks 或 dotagents 运行依赖；这些仅作为调研资料。

peter 预设依据用户提供的项目规约概括可迁移偏好，未复制业务代码、业务配置、凭据或私有接口。参考项目内的技术栈和专用领域规则不作为全局默认。
