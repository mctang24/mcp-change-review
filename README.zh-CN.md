# mcp-change-review

信任新的 MCP 配置前，先看清它新增了哪些权限。

在安装、升级或共享 Claude Code 和 Codex 的 MCP 配置时，用 `mcp-change-review` 检查哪些 MCP server 发生了变化、它们能访问哪些本机资源，以及密钥、命令执行、敏感路径等明显风险。

<p>
  <a href="./package.json"><img alt="Node 20 plus" src="https://img.shields.io/badge/node-20%2B-2563EB?style=flat-square&amp;logo=node.js&amp;logoColor=white"></a>
  <a href="./README.zh-CN.md#支持范围"><img alt="Claude Code supported" src="https://img.shields.io/badge/Claude%20Code-supported-000000?style=flat-square&amp;logo=anthropic&amp;logoColor=white"></a>
  <a href="./README.zh-CN.md#支持范围"><img alt="Codex supported" src="https://img.shields.io/badge/Codex-supported-000000?style=flat-square&amp;logo=data:image/svg+xml;base64,PHN2ZyBmaWxsPSJ3aGl0ZSIgZmlsbC1ydWxlPSJldmVub2RkIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTkuMjA1IDguNjU4di0yLjI2YzAtLjE5LjA3Mi0uMzMzLjIzOC0uNDI4bDQuNTQzLTIuNjE2Yy42MTktLjM1NyAxLjM1Ni0uNTIzIDIuMTE3LS41MjMgMi44NTQgMCA0LjY2MiAyLjIxMiA0LjY2MiA0LjU2NiAwIC4xNjcgMCAuMzU3LS4wMjQuNTQ3bC00LjcxLTIuNzU5YS43OTcuNzk3IDAgMDAtLjg1NiAwbC01Ljk3IDMuNDczem0xMC42MDkgOC44VjEyLjA2YzAtLjMzMy0uMTQzLS41Ny0uNDI5LS43MzdsLTUuOTctMy40NzMgMS45NS0xLjExOGEuNDMzLjQzMyAwIDAxLjQ3NiAwbDQuNTQzIDIuNjE3YzEuMzA5Ljc2IDIuMTg5IDIuMzc4IDIuMTg5IDMuOTQ4IDAgMS44MDgtMS4wNyAzLjQ3My0yLjc2IDQuMTYzek03LjgwMiAxMi43MDNsLTEuOTUtMS4xNDJjLS4xNjctLjA5NS0uMjM5LS4yMzgtLjIzOS0uNDI4VjUuODk5YzAtMi41NDUgMS45NS00LjQ3MiA0LjU5MS00LjQ3MiAxIDAgMS45MjcuMzMzIDIuNzEyLjkyOEw4LjIzIDUuMDY3Yy0uMjg1LjE2Ni0uNDI4LjQwNC0uNDI4LjczN3Y2Ljg5OHpNMTIgMTUuMTI4bC0yLjc5NS0xLjU3di0zLjMzTDEyIDguNjU4bDIuNzk1IDEuNTd2My4zM0wxMiAxNS4xMjh6bTEuNzk2IDcuMjNjLTEgMC0xLjkyNy0uMzMyLTIuNzEyLS45MjdsNC42ODYtMi43MTJjLjI4NS0uMTY2LjQyOC0uNDA0LjQyOC0uNzM3di02Ljg5OGwxLjk3NCAxLjE0MmMuMTY3LjA5NS4yMzguMjM4LjIzOC40Mjh2NS4yMzNjMCAyLjU0NS0xLjk3NCA0LjQ3Mi00LjYxNCA0LjQ3MnptLTUuNjM3LTUuMzAzbC00LjU0NC0yLjYxN2MtMS4zMDgtLjc2MS0yLjE4OC0yLjM3OC0yLjE4OC0zLjk0OEE0LjQ4MiA0LjQ4MiAwIDAxNC4yMSA2LjMyN3Y1LjQyM2MwIC4zMzMuMTQzLjU3MS40MjguNzM4bDUuOTQ3IDMuNDQ5LTEuOTUgMS4xMThhLjQzMi40MzIgMCAwMS0uNDc2IDB6bS0uMjYyIDMuOWMtMi42ODggMC00LjY2Mi0yLjAyMS00LjY2Mi00LjUxOSAwLS4xOS4wMjQtLjM4LjA0Ny0uNTdsNC42ODYgMi43MWMuMjg2LjE2Ny41NzEuMTY3Ljg1NiAwbDUuOTctMy40NDh2Mi4yNmMwIC4xOS0uMDcuMzMzLS4yMzcuNDI4bC00LjU0MyAyLjYxNmMtLjYxOS4zNTctMS4zNTYuNTIzLTIuMTE3LjUyM3ptNS44OTkgMi44M2E1Ljk0NyA1Ljk0NyAwIDAwNS44MjctNC43NTZDMjIuMjg3IDE4LjMzOSAyNCAxNS44NCAyNCAxMy4yOTZjMC0xLjY2NS0uNzEzLTMuMjgyLTEuOTk4LTQuNDQ4LjExOS0uNS4xOS0uOTk5LjE5LTEuNDk4IDAtMy40MDEtMi43NTktNS45NDctNS45NDYtNS45NDctLjY0MiAwLTEuMjYuMDk1LTEuODguMzFBNS45NjIgNS45NjIgMCAwMDEwLjIwNSAwYTUuOTQ3IDUuOTQ3IDAgMDAtNS44MjcgNC43NTdDMS43MTMgNS40NDcgMCA3Ljk0NSAwIDEwLjQ5YzAgMS42NjYuNzEzIDMuMjgzIDEuOTk4IDQuNDQ4LS4xMTkuNS0uMTkgMS0uMTkgMS40OTkgMCAzLjQwMSAyLjc1OSA1Ljk0NiA1Ljk0NiA1Ljk0Ni42NDIgMCAxLjI2LS4wOTUgMS44OC0uMzA5YTUuOTYgNS45NiAwIDAwNC4xNjIgMS43MTN6Ij48L3BhdGg+PC9zdmc+"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-16A34A?style=flat-square"></a>
</p>

[English](./README.md) | 简体中文

## 它能做什么

- 发现 Claude Code 和 Codex 使用的 MCP 配置。
- 创建本地基准快照，并报告 MCP server 的新增、删除和修改。
- 识别密钥、敏感路径、命令执行和 Docker `latest`。
- 支持终端输出，并可导出 Markdown 和 JSON 报告。

## 快速开始

```bash
curl -fsSL https://raw.githubusercontent.com/mctang24/mcp-change-review/main/install.sh | sh
```

## 命令

- `mcpcr list` - 列出已发现的 MCP server。
- `mcpcr status` - 检查当前目录是否已有基准快照。
- `mcpcr diff` - 对比当前 MCP 配置和基准快照；首次执行会创建 `.mcpcr-baseline.json`。
- `mcpcr accept` - 将审查后的当前状态标记为可信，并保存为新的基准快照。
- `mcpcr export md` - 生成 Markdown 报告。
- `mcpcr export json` - 生成 JSON 报告。
- `mcpcr diff --fail-on high` - 自动化场景中发现高风险变更时，以非零退出码退出。

## 示例

MCP server 会为 AI Agent 增加额外能力，例如读取本地文件或访问外部服务。

这个 Codex 示例新增了 `filesystem` 和 `github`，`mcpcr diff` 标出两项值得审查的权限变化：较宽的 home 目录访问，以及类似凭据的环境变量名称。

![Codex MCP 配置变更的 mcpcr diff 示例输出](./assets/example-codex-diff.png)

## 安全边界

`mcp-change-review` 只读取本机 MCP 配置，并用固定规则生成风险报告。

- **绝不保存密钥值。**
- **绝不修改 Claude Code 或 Codex 配置。**
- 只记录 env/header 名称。
- 不代理、阻断或拦截 MCP 工具调用。
- 使用固定检查规则，不依赖 LLM 判断风险。

## 支持范围

| 客户端 | 范围 |
| --- | --- |
| Claude Code | 本地、项目级和用户级 MCP 配置 |
| Codex | 用户级和受信任项目 MCP 配置 |

已基于 Claude Code `2.1.195` 和 Codex CLI `0.142.3` 验证。

## License

MIT
