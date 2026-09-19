# Sutra — enterprise architecture

Sutra is **not** an LLM bolted onto an editor. It is an **agent runtime + workspace intelligence + IDE shell + policy/sandbox**. The LLM is one component.

The core **does not know** Java, Spring, PostgreSQL, AWS, Nidhi, or Budget. Those appear only as:

- detectors (pom.xml → java+maven)
- MCP servers you attach
- steering files a team writes (`.ai/steering/`)

---

## Three products

| Product | What it is | What it is not |
|---|---|---|
| **IDE** | Workbench: files, editor, chat, terminal, diff, tasks | The brain |
| **Agent platform** | Runtime, tools, memory, model gateway, policy | A Java codegen service |
| **Workspace intelligence** | Discovery, lexical retrieval, later LSP/graph | Dumping the repo into the prompt |

V1 ships a Code-OSS-like workbench + the agent platform. VS Code / IntelliJ extensions are **clients** of the same runtime (do not fork a second agent).

```
Developer UI (web / Electron / VS Code / IntelliJ / CLI)
        │  HTTPS
        ▼
 Agent gateway  →  Agent runtime (observe → plan → tools → validate)
        │
        ├─ Context engine (few files, not 5000)
        ├─ Tool runtime (fs, git, shell, todo, spawn, MCP)
        ├─ Model gateway (Bedrock / OpenAI / xAI / Ollama)
        └─ Policy (allow / ask / deny)
        │
        ▼
 Local workspace  (sandbox later: Docker/ECS job)
```

---

## Six layers

1. **Developer UI** — Sutra workbench, VS Code extension, IntelliJ plugin, CLI.
2. **Agent orchestrator** — planner, tool loop, reviewer, human approval.
3. **Code intelligence** — discovery + retrieval now; LSP / tree-sitter / embeddings later.
4. **Tool / MCP** — built-in fs/git/shell stay in-process. GitLab, Jira, AWS, DBs are MCP.
5. **Knowledge** — `.ai/steering`, `SUTRA.md`, specs under `.ai/specs/` when the user asks for spec mode.
6. **Secure execution** — allowlisted shell, path containment, no production push without review.

---

## Agent loop (the product)

```
while not done:
  observe()      # discovery + retrieve relevant files + steering + chat history
  plan()         # model writes its own todos (no catalog)
  choose_tool()
  execute()      # policy gate
  inspect()
  if fail: diagnose / fix
  if complete: stop and show diff
```

The model **never** performs actions except through tools.

---

## Tools

**Built-in (always):** `read` `write` `edit` `glob` `grep` `bash` `todo` `spawn` `git_status` `git_diff`

**MCP (optional):** whatever the team enables. Core must work with MCP unplugged.

**Not in core:** `run_maven`, `run_sonar`, `create_jira_ticket` — those are MCP or steering + `bash` if the workspace has Maven.

---

## Spec mode (optional)

Quick task: “fix this bug” → loop only.

Spec task: “build loan management” → agent (not a template engine) writes:

```
.ai/specs/<slug>/
  requirements.md
  design.md
  tasks.md
```

Steering lives in `.ai/steering/*.md`. Hooks remain permission rules until a real event bus exists.

---

## Phased delivery

| Phase | Scope |
|---|---|
| **V1 (now)** | Workbench + tool loop + discovery + retrieval + steering + git diff + permissions + model router + MCP config |
| **V2** | Test/fix loop, sandbox jobs, richer git (branch/MR via MCP) |
| **V3** | LSP, symbol index, embeddings, `.ai/specs` as first-class UI |
| **V4** | Keycloak RBAC, audit, cost, org steering, GitLab/Jira MCP packs |

---

## What we refuse

- Wiring “unpaid employees” or any business screen into the runtime.
- Assuming Spring because the org uses Spring.
- Sending the whole repository to the model.
- `git push` / apply / kubectl without an approval gate.
- A second agent implementation inside the VS Code extension.

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for run / models / installers.
