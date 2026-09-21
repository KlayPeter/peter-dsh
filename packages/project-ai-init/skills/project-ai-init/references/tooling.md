# 工具安装与连接

用户要求初始化开发环境，且选择的规则需要工具时，应在授权范围内完成安装和连接，不只生成“请使用 MCP”的文字。只要求预览时不安装。先检查宿主已有工具，已可调用的不重复安装。

调用 ai_project_tooling(action=inspect) 或 `peter-ai tools --root <项目>`，并阅读项目 AGENTS.md、子目录规则和模板的 tools，补全识别遗漏。程序仅内置 CodeGraph 名称识别；其他服务由当前 Agent 理解与处理。

## CodeGraph

内置配方是 @colbymchenry/codegraph 1.6.0，提供 codegraph_explore 等工具。同名实现不能直接混用。确认用户指定的是这一实现后，调用 ai_project_tooling(action=install-codegraph) 或 `peter-ai setup-codegraph --root <项目>`。preview-codegraph / --dry-run 只看计划。

安装器在项目 .ai-init/runtime 安装固定版本，运行版本检查并构建本地索引，生成 .ai-init/codegraph.dsh.json。它不会使用 codegraph install 改动所有全局 Agent 设置。失败时保留已下载依赖供排查，不声称事务回滚；按错误解决后重试。

安装成功不等于 MCP 已连接，必须继续：

- dsh：确认用户当前 profile；缺少桥接包时用 `dsh plugin --profile <实际配置> add @deepseek-ai/dsh-mcp-client@0.1.0-rc.6`（对应已验证 Harness 版本，其他版本先核实匹配）。保留已有启动参数，追加 `--patch <安装返回的 overlay>`。不要中断自己所在服务；明确给出用户需要执行的重启命令。已有持久 profile 层由宿主按 dsh 文档合并，保留现有插件。
- Codex / Claude：读取该宿主当前 MCP 配置约定，只合并所需服务；使用返回 overlay 中的绝对 command、args 与 cwd，保留其他 MCP。项目作用域优先；若宿主仅支持全局注册，先说明作用域，不把所有 Agent 一起改掉。不要复制凭据。
- 连接后实际检查 tools/list 并调用只读工具（如 codegraph_explore）。未重启、缺凭据、连接失败或项目无可索引代码，均分开说明，不能报告全部就绪。

## 其他 MCP / 工具

宿主 Agent 查阅具体项目的官方安装说明，核实来源、版本、系统依赖、目标 Agent 的配置格式，再使用宿主执行工具安装、合并配置和验证。不要直接执行参考仓库里的未知脚本，不自动加入宽泛权限白名单。需要密钥或登录时只向用户索取缺失配置，通过环境变量或宿主密钥管理保存，不能放进模板或共享仓库。无法找到确定来源时询问工具链接，而不是根据简称安装同名包。

完成时逐项报告：已安装、已连接并调用、待重启、待凭据、失败原因。doctor 只验证配置文件，不代表这些状态全部通过。
