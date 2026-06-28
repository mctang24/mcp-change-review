<h1 align="center">mcp-change-review</h1>

<p align="center">
  Review MCP config changes before Claude Code or Codex gets new tools, tokens, or filesystem access.
</p>

<p align="center">
  <img alt="node >=20" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="CLI mcpcr" src="https://img.shields.io/badge/CLI-mcpcr-111827?style=for-the-badge">
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-supported-D97706?style=for-the-badge">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-supported-111827?style=for-the-badge">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-16A34A?style=for-the-badge">
</p>

<p align="center">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

MCP servers can give AI agents new tools, credentials, and filesystem reach. `mcp-change-review` shows the local config diff before that access becomes your new baseline.

## What it does

- Finds Claude Code and Codex MCP configuration.
- Creates a local baseline for the current MCP state.
- Shows added, removed, and changed MCP servers.
- Flags high-signal risks such as sensitive env/header names, `.env`, `.ssh`, broad home access, `sudo`, remote script execution, and Docker `latest`.
- Exports terminal, Markdown, and JSON reports.

## Quick start

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

The first `diff` creates `.mcpcr-baseline.json` in the current directory. After you review and accept the current state:

```bash
mcpcr accept
```

## Commands

| Command | Purpose |
| --- | --- |
| `mcpcr list` | Show discovered MCP servers. |
| `mcpcr status` | Show baseline status and current config summary. |
| `mcpcr diff` | Compare current MCP config against the baseline. |
| `mcpcr accept` | Save the current MCP config as the new baseline. |
| `mcpcr export md` | Write a Markdown report. |
| `mcpcr export json` | Write a JSON report. |
| `mcpcr diff --fail-on high` | Return a non-zero exit code when high risk is found. |

## Safety model

`mcp-change-review` is deliberately local and deterministic.

- It does not save secret values.
- It records env/header names only.
- It does not modify Claude Code or Codex config.
- It does not proxy, block, or intercept MCP tool calls.
- It does not use an LLM to judge risk.

## Supported clients

| Client | Scope |
| --- | --- |
| Claude Code | local, project, and user MCP config |
| Codex | user and trusted project MCP config |

Validated with Claude Code `2.1.195` and Codex CLI `0.142.3`.

## License

MIT
