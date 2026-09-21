# 项目 AI 配置初始化

为用户当前目标生成项目级 Agent 配置，并为明确的空项目需求建立最小工程骨架。

## 边界

当前 Agent 负责理解问题、读取现有指令、选择技术方案和解决语义冲突。确定性引擎负责文件扫描、配置规划、归属判断和写入。骨架生成不等于业务交付，不运行待配置项目的代码。

```mermaid
flowchart TD
  U[用户目标与偏好] --> S[扫描项目文件]
  S --> D{已有内容?}
  D -->|有| E[保留技术栈与已有规约]
  D -->|无| N{目标和技术栈明确?}
  N -->|否| Q[返回问题 不写入]
  N -->|是| T[选择最小骨架]
  E --> P[生成计划与差异]
  T --> P
  P --> G{冲突与快照检查}
  G -->|通过| W[应用配置并记录基线]
  G -->|失败| R[保留现场 重新计划或解决冲突]
  W --> V[当前 Agent 实现业务与验证]
  V --> Y[sync 更新项目事实]
```

## 实现地图

| 文件 | 职责 |
| --- | --- |
| src/preferences.js | 参考证据读取、可复用模板导出 |
| src/tooling.js | 工具需求、固定版本 CodeGraph 安装与 MCP 覆盖层 |
| src/briefing.js | 常用命令、项目提醒、来源版本与过期判断、compact 速查 |
| src/scan.js | 有边界的文件清单、manifest 线索与命令来源 |
| src/starters.js | 保守路由、四种零依赖骨架 |
| src/render.js | 预设、规则入口与项目事实输出 |
| src/files.js | 路径校验、符号链接拒绝、按文件原子替换 |
| src/index.js | 计划、快照、受管理区域、锁、回滚与检查 |
| src/cli.js | 本地命令行及 Skill 安装 |
| src/dsh.js | 七个工具和运行时 Skill，固定 workspaceRoot |
| presets/peter.json | 可迁移个人偏好；无业务服务配置 |

## 状态与验证

config 是用户可编辑的来源，state 记录管理归属与基线。受管理区外不动，骨架创建后不覆盖。冲突不应用；过期计划拒绝；失败回滚不覆盖期间发生的用户修改。进程强杀后的恢复需用户核对 Git 与锁文件，不承诺持久事务。

测试地图：tests/project.test.js 覆盖行为与数据保护；tests/cli.test.js 覆盖安装包入口与退出状态；scripts/test-project-ai-harness.mjs 验证真实 SDK 注册、调用、计划失效、同步与卸载。用户参考项目只读预览验证了不同子项目的包管理器识别。

偏好分两层：preset 是跨项目模板，projectRules 仅用于当前项目。参考仓库只读，语义提炼由宿主 Agent 完成，导出不包含项目调整。工具安装与配置写入是独立操作：CodeGraph 安装失败不回滚已下载依赖；完成索引后仍需宿主连接验证。

## v0.3：默认轻量与项目证据

新配置默认 compact + minimal：AGENTS.md 承载常用命令、执行目录、包管理器差异、阅读入口和必要偏好。更新元数据仍在 .ai-init，保留归属保护；expanded 用于明确需要拆分阅读的项目。v0.2 没有 layout 的配置按 expanded 处理，沿用原 preset，只有显式迁移才移除未修改的旧生成文件。

projectFacts 是宿主 Agent 提炼的项目知识，包含 text 与本地来源路径、SHA-256。保存时读取真实来源，应用前再次校验；同步时来源改变或丢失，将该结论移至待核实，doctor 返回 needs-review。来源哈希不认证推理正确，也不证明测试通过。重新阅读后显式提交 projectFacts 才刷新基线；导出个人 preset 不含这些项目知识。

inspect 提供有序的阅读入口、脚本真实定义和限量带行号摘录。优先根 README、功能索引与规则，再读 CI 和具体功能文档；只列前 12 个常用命令，保留目录，不把 setup/deploy 当默认执行项。所有命令未执行；宿主按用户任务审查并运行适当验证，结果不永久写成已通过。

tests/compact.test.js 验证轻量默认、多工具链、来源过期与应用前变化、旧配置兼容迁移、未修改文件清理与手写保留、摘要截断、个人模板不携带项目知识。原 expanded 数据保护测试继续保留，CLI 与真实 dsh 工具参数也需要验证。

本轮验证：29 项 AI Init 测试与全仓库 53 项测试通过；独立 tarball CLI 验证真实 v0.2 配置保留与显式 compact 迁移；Harness 0.1.0-rc.6 隔离 web profile 实际加载新版并调用 inspect、plan、apply、doctor，验证来源变化返回 needs-review。用户参考项目仅只读预览，未应用，也未执行其业务脚本。没有进行模型驱动的完整开发收益评测。
