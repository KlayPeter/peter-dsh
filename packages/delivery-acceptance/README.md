# Delivery Acceptance · 任务真的做完了吗？

Agent 说“完成了”，你还想知道：需求有没有漏？功能实际跑过没有？测试结果对应的是不是最后一版？

交付验收助手把这些问题变成逐项检查：从原始需求整理验收条件，执行具体检查、保留证据，再告诉你哪些已验证、哪些失败、还差什么。

## 什么时候用？

| 你要确认的事 | 可以怎么验收 |
| --- | --- |
| 一个 bug 是否真的修好了 | 重跑原始复现和适当回归，保存实际结果 |
| 插件是否能用 | 分别验证安装、加载、真实调用，不把安装成功当成全部完成 |
| 文档是否可以交付 | 检查内容、链接与渲染，再按说明尝试操作 |
| 导出的文件是否正常 | 检查产物，并由 Agent 实际打开复查字体、图表和分页 |
| Agent 有没有漏需求 | 将原始需求逐项对应到证据，列出未检查和无法检查的部分 |

当前 v0.2.0 支持 DeepSeek Harness、独立 CLI 和通用 Skill。不需要额外模型 API：当前 Agent 判断需求与证据是否匹配，程序执行检查并记录结果。

## 安装到 DeepSeek Harness

需要已能正常使用的 dsh、Node.js 22+、Git 和 pnpm。以下命令用于 macOS / Linux；目前未发布 npm，通过仓库打包安装。

安装源码放在固定工具目录，不需要放进待处理的业务项目。已有仓库可直接复用并跳过下载；插件已安装时，直接从目标项目启动 dsh，无需重复 clone。以下首次下载命令要求 `~/.local/share/peter-dsh/source` 尚不存在。

```sh
mkdir -p "$HOME/.local/share/peter-dsh"
git clone https://github.com/KlayPeter/peter-dsh.git "$HOME/.local/share/peter-dsh/source"
cd "$HOME/.local/share/peter-dsh/source"
npm ci
mkdir -p "$HOME/.local/share/peter-dsh/packages"
npm pack --workspace @klaypeter/delivery-acceptance --pack-destination "$HOME/.local/share/peter-dsh/packages"
dsh plugin --profile web add "$HOME/.local/share/peter-dsh/packages/klaypeter-delivery-acceptance-0.2.0.tgz"
```

已经下载仓库的用户直接进入原目录。`web` 改成你平时使用的 profile；没有 pnpm 时先执行 `npm install -g pnpm`。

关闭旧 dsh，从**待验收项目**启动，把下面路径换成实际目录：

```sh
cd /path/to/your-project
dsh --profile web
```

然后直接说：

> 使用 delivery-acceptance，按我这次的原始需求和后续修改验收交付。逐项核实证据，检查有没有遗漏。先检查并给报告，不修改代码。

想让 Agent 一直处理到可以交付，也可以说：

> 使用 delivery-acceptance，验收到完成。发现当前需求内的问题就修复，再重新验证。缺少环境或需要我判断的地方明确告诉我。

工具不会自动获得其他任务的聊天记录；原始需求不在当前会话时，请提供需求文字或文件。安装后可用 `dsh plugin --profile web list --depth 0` 检查包，并让 Agent 调用 `acceptance_start` 建立一个验收计划，确认工具加载；start 不执行检查命令。

## 你说任务，Agent 负责跑检查

不需要你写 JSON 或逐个调用工具。Agent 根据原始需求和项目实际内容整理检查项，核对将执行的命令，再一次运行选定的检查。结果先回答“能否确认完成、还差什么”，完整日志放在报告里。

已有项目回归脚本或 AI Init 的 project-check 时，可以复用为检查入口；仍会单独核对安装、实际使用和必要交付物。内容交付的复查结果也可作为线索，不能直接当作文稿已验收。

## 报告长什么样？

报告先展示必要项的通过、失败和待核实数量，以及优先处理的缺口，再展示完整明细。下面是一份示意，实际结果取决于项目和证据：

| 验收项 | 状态 | 依据或缺口 |
| --- | --- | --- |
| CLI 能显示帮助 | 已验证 | 实际命令退出 0，输出包含预期内容 |
| README 包含安装入口 | 已验证 | 文件检查通过 |
| 新用户照 README 能完成安装 | 待复核 | 仅检查了文字，还不能证明步骤可用 |
| 线上回调正常 | 环境受限 | 缺少测试环境和回调凭据 |

每批验收在目标项目生成 `.delivery-acceptance/<run-id>/`：

```text
contract.json          # 任务、验收项和检查范围
evidence/              # 每次检查的输出、时间、退出码与文件摘要
report-<id>/
  report.md            # 易读的验收报告，附证据链接
  report.json          # 结构化结果，供工具继续处理
```

每次导出产生新报告，保留旧结果。日志可能包含敏感信息，请检查后再分享；可将 `.delivery-acceptance/` 加入目标项目的 `.gitignore`。

## 它怎么判断完成？

1. **先核对要求**：从用户原始需求及后续修正整理条件，不能拿 Agent 的完成总结代替需求。推导出的条件标为 derived。
2. **执行匹配的检查**：支持命令检查和文件断言；浏览器、外部服务、人工阅读由当前 Agent 使用相应工具完成并记录观察。
3. **绑定当前文件**：证据包含检查范围的内容摘要。范围内文件或验收标准改变后，旧证据会显示过期。
4. **逐项报告缺口**：必要项失败则未完成；未检查、证据过期、缺环境或待复核，都不能自动算通过。

`verified-within-scope` 表示声明范围内的必要自动检查通过。它不证明遗漏的需求、所有异常情况或文档质量。Agent 仍须核对“检查是否选对了”。

手工观察即使填写 pass，仍是 `needs-review`，不会冒充程序独立验证。原本缺环境的项目标为 `blocked`，和明确失败分开。用户确认或 Agent 给出的最终语义判断应在交付说明中单独表达，不能改写为自动测试通过。

## 独立 CLI / 其他 Agent

在仓库根目录打包安装：

```sh
npm pack --workspace @klaypeter/delivery-acceptance
npm install -g ./klaypeter-delivery-acceptance-0.2.0.tgz
peter-accept install-skill --target /path/to/your-project/.agents/skills
```

目标路径换成 Agent 实际读取的 Skill 目录。安装会带上工作流和参考资料；已有 Skill 拒绝覆盖。升级 Skill 时先保存自己的修改，再替换旧目录。

让当前 Agent 读取原始需求，参照 [examples/acceptance.json](examples/acceptance.json) 生成这个项目的验收合同。不要直接拿示例验收不相关项目。

```sh
# 创建批次，不执行命令；从输出取得 run 的值
peter-accept start --root /path/to/project --contract ./acceptance.json
# 把 RUN_ID 换成上一步返回的实际值
peter-accept inspect --root /path/to/project --run RUN_ID
# 核对合同后，从 inspect 输出取得 contractHash，替换 HASH
# C1、C2 换成当前合同中要执行的自动检查 ID
peter-accept run --root /path/to/project --run RUN_ID --criteria C1,C2 --contract-hash HASH --export
# 单项复验也可以用 check
peter-accept check --root /path/to/project --run RUN_ID --criterion C1
# 记录当前宿主的观察（正向自述仍待复核）
peter-accept observe --root /path/to/project --run RUN_ID --criterion C3 \
  --outcome blocked --note "尚无可用的独立安装环境"
# 导出 Markdown 和 JSON；也可不加 --export 仅看结果
peter-accept report --root /path/to/project --run RUN_ID --export
```

run 一次接受 1–10 个不同的自动检查 ID，不接受 manual。执行前检查完整选择和合同版本；合同变动时停止，普通检查失败时继续收集其他项的结果。contractHash 只用于版本校验，不代表授权。

run / report 退出码：0 为声明范围内必要自动检查通过，2 为证据不足，3 为必要项失败，1 为操作错误。check 非通过时退出 2。

Codex 项目 Skill 使用 `.agents/skills`；Claude Code 使用 `.claude/skills`，将上方 install-skill 的 `--target` 换成对应目录即可。更新后刷新或重启 Agent；已有同名 Skill 先保存自定义修改再替换。dsh 的插件安装已注册 Skill，无需重复复制。

## 合同里的字段

| 字段 | 用途 |
| --- | --- |
| schemaVersion | 当前为 1 |
| task / source | 任务以及原始需求来源、后续修正 |
| scope | 与任务有关的源文件、测试、配置、交付物，相对项目目录 |
| criteria[].id / requirement / expected | 稳定编号、要满足的要求、怎样算通过 |
| origin | user：明确需求；derived：推导条件，结果仍待确认 |
| required | 是否为完成任务的必要条件 |
| method | command / artifact / manual |
| command | file、args 数组；可选 cwd 和 timeoutMs |
| stdoutIncludes | 命令的标准输出必须包含的文本，可选 |
| artifact / contains | 非空文件检查，以及可选文字断言 |

scope 必须包含影响检查意义的代码、测试与配置。目录会递归记录新增和删除的文件；不存在的路径记录为缺失。不支持 `.`、绝对路径或符号链接；列出实际目录如 `src`、`tests`、`package.json`、锁文件和 README。依赖、Git 内部和验收记录目录跳过。限制为 10,000 个条目、20 层、64 MiB，超出明确报错。

命令运行期间修改了 scope 内文件，结果记为 stale；核对变化后重新检查。报告采用每项最近一次记录，不用旧的成功覆盖新失败。想修改验收标准，先核对用户需求再建新批次；直接修改原合同也会使旧证据失效。

## dsh 配置与工具

| 工具 | 用途 |
| --- | --- |
| acceptance_start | 建立验收合同，不执行检查 |
| acceptance_inspect | 查看合同及将执行的命令 |
| acceptance_run | 一次执行选定检查并导出报告，先展示必要项缺口 |
| acceptance_check | 执行指定检查并保存原始证据 |
| acceptance_observe | 记录实际观察、失败或环境限制 |
| acceptance_report | 检查证据是否过期，生成两种格式的报告 |

有 skills 服务时自动注册 `delivery-acceptance`。默认文件根目录为 dsh 启动目录；网页切换会话不改变该目录。服务部署可用覆盖层设置：

```yaml
- id: peter-delivery-acceptance
  config:
    workspaceRoot: /absolute/path/to/project
```

启动加 `--patch /path/to/workspace.yml`，保留原有启动参数。

## 能力边界

- 检查命令**不在沙箱里**，可能写文件或访问网络。先核对合同与任务授权；插件不自动运行未知脚本、发布或部署。命令使用参数数组，不自动经 shell。
- 单次命令最长 120 秒，输出限制约 1 MiB；超时、退出失败或输出溢出不会算通过。长耗时或外部验证由宿主执行并记录待复核证据。
- 文件摘要不代表外部环境快照。数据库、服务、登录态改变时要重新验证，不能只凭文件未变就认为线上仍正常。
- 本地记录没有签名，不能抵抗同权限篡改，也不认证第三方日志的真实性。
- 没有自动人工签收功能；待复核项目不会由自述 pass 变成“完全完成”。测试运行中断可能留下 lock，确认无检查运行并核对证据后再手动删除。

运行 `npm test --workspace @klaypeter/delivery-acceptance` 验证状态判断、证据过期、失败、锁与 CLI。真实 dsh 服务验证脚本为仓库中的 `scripts/test-acceptance-harness.mjs`。未做模型驱动的全流程验收评测。

原创代码 MIT，第三方资料许可见 [THIRD_PARTY.md](THIRD_PARTY.md)，实现设计见 [FEATURE.md](FEATURE.md)。

## 升级

在原插件仓库目录执行 `git pull`、`npm ci`，再按安装章节重新打包并用 `dsh plugin --profile web add` 安装 v0.2.0 包，最后重启相同 profile。原有批次仍可读取；先 inspect 获取当前 contractHash，再调用新的批量检查工具。独立 Skill 用户需保存自定义修改后更新 Skill 目录。
