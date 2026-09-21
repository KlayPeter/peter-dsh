# 验收与证据

## 按任务选择检查

| 任务 | 至少核实 | 不能替代的证明 |
| --- | --- | --- |
| 修 bug | 原始复现、修复后的相同路径、适当回归 | 只改代码或跑不相关测试 |
| 新功能 | 核心用户路径、必要异常路径、实际输出 | 只验证接口存在 |
| 插件 / MCP 配置 | 安装、加载、真实调用、目标项目是否正确 | npm 安装成功或只写了配置 |
| 文档 | 内容是否符合需求、链接和渲染、照说明能否操作 | 只查文件存在或关键字 |
| PDF / Word | 产物存在、实际打开、字体图表分页 | 导出进程退出 0 |
| 网页 | 实际交互、渲染和控制台问题、相关尺寸 | 单张截图或只跑 lint |

## contract

schemaVersion=1；task 是任务原文或忠实摘要，source 描述来自哪条用户要求/文档及后续修正；scope 是项目相对文件或目录数组。需包含所有影响检查含义的实现、测试、锁文件和配置。不存在的路径也记录为缺失；符号链接拒绝，依赖目录、Git 内部及验收产物不参与扫描。超过限制明确报错，不悄悄截断。

每个 criterion 必须有 id、requirement、expected、origin（user/derived）、required、method。

- command：command={file,args,cwd?,timeoutMs?}，可选 stdoutIncludes。file/args 是参数数组，不自动经 shell；不要为了管道便利改用不明 shell 脚本。退出 0 且显式文字断言通过只是该检查通过，host 必须判断测试是否匹配预期。timeout 上限 120 秒，输出上限 1 MiB；超时、失败、输出溢出均不得通过。
- artifact：artifact 是 scope 内相对路径，检查非空普通文件，可选 contains。只证明这些机械条件，不声称质量。
- manual：用浏览器/人工/外部工具检查；observe 的 note 写预期、实际、来源和限制，artifact 可附本地截图或日志。正向观察仍为 needs-review，负向为 failed，环境不足为 blocked。

CLI 用 --contract 读取 JSON；dsh start 的 contractJson 是 JSON 字符串。先 inspect，再 check 指定 ID。JSON 示例随 npm 包 examples/acceptance.json 提供。

## 证据有效性

每条证据绑定 contract 哈希与 scope 内容摘要，记录时间、命令、退出码、stdout/stderr。运行期间修改 scope 内文件，结果为 stale；先检查这些变动是否合理，再复验。不要因测试生成文件反复过期就忽略整个源码目录，可在选 scope 时明确列出真正的输入和要求验收的产物。

每项采用最近一次记录，旧失败保留在 evidence 历史；不能挑旧的绿灯掩盖新失败。合同变更使旧证据过期。要改标准先核对用户要求；创建新批次，不删除失败记录凑通过。

报告分两层：必要机械检查的 verdict 与每项状态。failed 必要项 => not-complete；全部必要自动检查通过且 origin=user => verified-within-scope；其余 => incomplete-evidence。可选项的问题也列出，但不阻断必要项结论。自动“通过”不证明没有漏项，也不等于用户已签收。

文件哈希不覆盖数据库、远程服务、权限和浏览器实时状态；涉及这些内容需当前环境重新验证。证据为本地可编辑记录，没有数字签名，不能抵抗同权限篡改。不可凭这套记录认证第三方提交的日志真实性。

运行命令不在沙箱中，可能写文件或访问网络。用户要求验收并不等于授权付款、部署或删除数据；使用本地测试环境和适当权限。输出保存在项目 .delivery-acceptance 下，可能含敏感日志，先检查再分享或提交。
