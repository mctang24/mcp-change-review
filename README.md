# mcp-change-review

Review MCP access changes before they reach Claude Code or Codex.

Inspect changed MCP servers, see which local resources they can access, and catch obvious risks such as secrets, shell commands, and sensitive paths.

<p translate="no">
  <a href="./package.json"><img alt="Node 20 plus" src="https://img.shields.io/badge/node-20%2B-2563EB?style=flat-square&amp;logo=node.js&amp;logoColor=white"></a>
  <a href="./README.md#supported-clients"><img alt="Claude Code supported" src="https://img.shields.io/badge/Claude%20Code-supported-000000?style=flat-square&amp;logo=anthropic&amp;logoColor=white"></a>
  <a href="./README.md#supported-clients"><img alt="Codex supported" src="https://img.shields.io/badge/Codex-supported-000000?style=flat-square&amp;logo=data:image/svg+xml;base64,PHN2ZyBmaWxsPSJ3aGl0ZSIgZmlsbC1ydWxlPSJldmVub2RkIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTkuMjA1IDguNjU4di0yLjI2YzAtLjE5LjA3Mi0uMzMzLjIzOC0uNDI4bDQuNTQzLTIuNjE2Yy42MTktLjM1NyAxLjM1Ni0uNTIzIDIuMTE3LS41MjMgMi44NTQgMCA0LjY2MiAyLjIxMiA0LjY2MiA0LjU2NiAwIC4xNjcgMCAuMzU3LS4wMjQuNTQ3bC00LjcxLTIuNzU5YS43OTcuNzk3IDAgMDAtLjg1NiAwbC01Ljk3IDMuNDczem0xMC42MDkgOC44VjEyLjA2YzAtLjMzMy0uMTQzLS41Ny0uNDI5LS43MzdsLTUuOTctMy40NzMgMS45NS0xLjExOGEuNDMzLjQzMyAwIDAxLjQ3NiAwbDQuNTQzIDIuNjE3YzEuMzA5Ljc2IDIuMTg5IDIuMzc4IDIuMTg5IDMuOTQ4IDAgMS44MDgtMS4wNyAzLjQ3My0yLjc2IDQuMTYzek03LjgwMiAxMi43MDNsLTEuOTUtMS4xNDJjLS4xNjctLjA5NS0uMjM5LS4yMzgtLjIzOS0uNDI4VjUuODk5YzAtMi41NDUgMS45NS00LjQ3MiA0LjU5MS00LjQ3MiAxIDAgMS45MjcuMzMzIDIuNzEyLjkyOEw4LjIzIDUuMDY3Yy0uMjg1LjE2Ni0uNDI4LjQwNC0uNDI4LjczN3Y2Ljg5OHpNMTIgMTUuMTI4bC0yLjc5NS0xLjU3di0zLjMzTDEyIDguNjU4bDIuNzk1IDEuNTd2My4zM0wxMiAxNS4xMjh6bTEuNzk2IDcuMjNjLTEgMC0xLjkyNy0uMzMyLTIuNzEyLS45MjdsNC42ODYtMi43MTJjLjI4NS0uMTY2LjQyOC0uNDA0LjQyOC0uNzM3di02Ljg5OGwxLjk3NCAxLjE0MmMuMTY3LjA5NS4yMzguMjM4LjIzOC40Mjh2NS4yMzNjMCAyLjU0NS0xLjk3NCA0LjQ3Mi00LjYxNCA0LjQ3MnptLTUuNjM3LTUuMzAzbC00LjU0NC0yLjYxN2MtMS4zMDgtLjc2MS0yLjE4OC0yLjM3OC0yLjE4OC0zLjk0OEE0LjQ4MiA0LjQ4MiAwIDAxNC4yMSA2LjMyN3Y1LjQyM2MwIC4zMzMuMTQzLjU3MS40MjguNzM4bDUuOTQ3IDMuNDQ5LTEuOTUgMS4xMThhLjQzMi40MzIgMCAwMS0uNDc2IDB6bS0uMjYyIDMuOWMtMi42ODggMC00LjY2Mi0yLjAyMS00LjY2Mi00LjUxOSAwLS4xOS4wMjQtLjM4LjA0Ny0uNTdsNC42ODYgMi43MWMuMjg2LjE2Ny41NzEuMTY3Ljg1NiAwbDUuOTctMy40NDh2Mi4yNmMwIC4xOS0uMDcuMzMzLS4yMzcuNDI4bC00LjU0MyAyLjYxNmMtLjYxOS4zNTctMS4zNTYuNTIzLTIuMTE3LjUyM3ptNS44OTkgMi44M2E1Ljk0NyA1Ljk0NyAwIDAwNS44MjctNC43NTZDMjIuMjg3IDE4LjMzOSAyNCAxNS44NCAyNCAxMy4yOTZjMC0xLjY2NS0uNzEzLTMuMjgyLTEuOTk4LTQuNDQ4LjExOS0uNS4xOS0uOTk5LjE5LTEuNDk4IDAtMy40MDEtMi43NTktNS45NDctNS45NDYtNS45NDctLjY0MiAwLTEuMjYuMDk1LTEuODguMzFBNS45NjIgNS45NjIgMCAwMDEwLjIwNSAwYTUuOTQ3IDUuOTQ3IDAgMDAtNS44MjcgNC43NTdDMS43MTMgNS40NDcgMCA3Ljk0NSAwIDEwLjQ5YzAgMS42NjYuNzEzIDMuMjgzIDEuOTk4IDQuNDQ4LS4xMTkuNS0uMTkgMS0uMTkgMS40OTkgMCAzLjQwMSAyLjc1OSA1Ljk0NiA1Ljk0NiA1Ljk0Ni42NDIgMCAxLjI2LS4wOTUgMS44OC0uMzA5YTUuOTYgNS45NiAwIDAwNC4xNjIgMS43MTN6Ij48L3BhdGg+PC9zdmc+"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-16A34A?style=flat-square"></a>
</p>

English | [简体中文](./README.zh-CN.md)

## What it does

- Discover MCP configuration used by Claude Code and Codex.
- Create a local baseline and report added, removed, or changed MCP servers.
- Flag secrets, sensitive paths, command execution, and Docker `latest`.
- Print terminal output or export Markdown and JSON reports.

## Quick start

```bash
curl --http1.1 -fsSL https://raw.githubusercontent.com/mctang24/mcp-change-review/main/install.sh | sh
```

## Commands

| Command | Purpose |
| --- | --- |
| `mcpcr list` | List discovered MCP servers. |
| `mcpcr status` | Check whether the current directory has a baseline. |
| `mcpcr diff` | Compare the current MCP config with the baseline; the first run creates `.mcpcr-baseline.json` in the current directory. |
| `mcpcr accept` | Mark the reviewed state as trusted and save it as the new baseline. |
| `mcpcr export md` | Generate a Markdown report. |
| `mcpcr export json` | Generate a JSON report. |
| `mcpcr diff --fail-on high` | Exit non-zero when high-risk changes are found. |

## Safety model

`mcp-change-review` is local and deterministic by design.

- **It never stores secret values.**
- **It never modifies Claude Code or Codex configuration.**
- It records env/header names only.
- It does not proxy, block, or intercept MCP tool calls.
- It does not use an LLM to assess risk.

## Supported clients

| Client | Scope |
| --- | --- |
| Claude Code | local, project, and user-level MCP configuration |
| Codex | user-level and trusted project MCP configuration |

Validated against Claude Code `2.1.195` and Codex CLI `0.142.3`.

## License

MIT
