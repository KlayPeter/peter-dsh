# Agent 适配

默认生成 AGENTS.md，适合已启用对应指令 provider 的 dsh 以及支持该约定的 Agent。CLI 的 targets 目前支持 dsh、codex、claude。dsh/codex 复用同一个入口；claude 目标增加 CLAUDE.md 内的 @AGENTS.md 导入区域，保留原文。

不要把 Claude 的 @ 导入当成通用 Markdown 标准。AGENTS.md 内只用普通相对链接，并明确何时读取。已有重复导入或软链接应在应用前核对；本初始化器拒绝写入符号链接，不能替换链接来强行通过。

Skill 可以用 peter-ai install-skill --target <实际扫描目录> 安装自身及上游参考；CLI 需单独安装。dsh 注册运行时 Skill 时不需要重复复制。初始化器不会自动联网安装推荐 Skill，也不修改用户全局配置或 Hooks。

本版扫描 Node manifest 的脚本可生成精确 runner；Python/Rust/Go/Flutter 可检测到技术线索，但其复杂任务配置仍需当前 Agent 阅读源文件确认。每个目标 Agent 是否已加载规则仍需实际检查，doctor 不冒充宿主集成测试。
