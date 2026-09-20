# 空项目

仓库只有 Git 元数据、许可证、忽略规则或 Agent 指令时可视为空项目。README 或业务资料存在时按已有内容分析，不能清空再套模板。

用户要求搭建时，先明确用途和关键技术选择。只有会改变输出的缺口才问；明确的 Node.js CLI / Python CLI / 纯静态网页 / 文档仓库可分别选择 node-cli / python-cli / static-web / docs。只想配规则选 none。auto 是保守关键词识别，不是通用意图分类器，否定、替代或不匹配时需你显式选择。

```sh
peter-ai init --root ./project --request "做一个 Python 命令行工具" --starter python-cli
```

骨架零运行依赖，可直接执行 README 中的入口与测试。它不实现用户的任意业务。接着实现请求里的真实功能，补齐功能文档和验证；再 sync 更新项目事实。

若用户选 React、Flutter、Go 等内置骨架未覆盖的技术栈，使用其已有工具或当前官方脚手架搭建。先审查命令副作用并按当前授权执行；不要运行来路不明的安装脚本。搭建后走已有项目配置，保留实际生成的 manifest 和命令。
