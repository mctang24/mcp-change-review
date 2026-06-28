<h1 align="center">mcp-change-review</h1>

<p align="center">
  在 Claude Code 或 Codex 获得新的工具、凭证或文件访问能力前，先审查 MCP 配置变更。
</p>

<p align="center">
  <img alt="node >=20" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="CLI mcpcr" src="https://img.shields.io/badge/CLI-mcpcr-111827?style=for-the-badge">
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-supported-D97706?style=for-the-badge">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-supported-111827?style=for-the-badge">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-16A34A?style=for-the-badge">
</p>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

MCP server 可以把新的本地能力交给 AI Agent。`mcp-change-review` 关注一件事：从上一次可信 baseline 到现在，MCP 配置到底变了什么。

## 它能做什么

- 发现 Claude Code 和 Codex 的 MCP 配置。
- 为当前 MCP 状态创建本地 baseline。
- 展示新增、删除、修改的 MCP server。
- 标记高信号风险：敏感 env/header 名称、`.env`、`.ssh`、home 目录大范围访问、`sudo`、远程脚本直接执行、Docker `latest`。
- 输出终端、Markdown、JSON 三种报告。

## 快速开始

```bash
git clone https://github.com/mctang24/mcp-change-review.git
cd mcp-change-review
npm install
npm run build
npm link
```

```bash
mcpcr list
mcpcr status
mcpcr diff
```

第一次执行 `diff` 会在当前目录创建 `.mcpcr-baseline.json`。确认当前状态可信后，可以更新 baseline：

```bash
mcpcr accept
```

## 命令

| 命令 | 用途 |
| --- | --- |
| `mcpcr list` | 查看已发现的 MCP server。 |
| `mcpcr status` | 查看 baseline 状态和当前配置摘要。 |
| `mcpcr diff` | 对比当前 MCP 配置和 baseline。 |
| `mcpcr accept` | 将当前 MCP 配置保存为新的 baseline。 |
| `mcpcr export md` | 导出 Markdown 报告。 |
| `mcpcr export json` | 导出 JSON 报告。 |
| `mcpcr diff --fail-on high` | 发现 high 风险时返回非零退出码。 |

## 安全边界

`mcp-change-review` 是一个本地、确定性的审查工具。

- 不保存 secret value。
- 只记录 env/header 名称。
- 不修改 Claude Code 或 Codex 配置。
- 不代理、阻断或拦截 MCP tool call。
- 不依赖 LLM 判断风险。

## 支持范围

| 客户端 | 范围 |
| --- | --- |
| Claude Code | local、project、user MCP 配置 |
| Codex | user、trusted project MCP 配置 |

已基于 Claude Code `2.1.195` 和 Codex CLI `0.142.3` 验证。

## License

MIT
