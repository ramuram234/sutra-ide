# Sutra IDE — Developer Guide

This is the operator and developer manual for Sutra: how it is built, how to run it, how to plug in **any** LLM (xAI, OpenAI, Ollama, vLLM, AWS Bedrock, Azure, your own HTTP server), how to attach **MCP** tools, how to put **Keycloak** in front of users, how **token limits** work, and how to ship **Windows / macOS installers** plus **VS Code and IntelliJ** extensions.

Repository: https://github.com/ramuram234/sutra-ide

---

## 1. What Sutra is

Sutra is a spec-driven AI software IDE (same idea as Kiro):

1. You describe a product in chat (**Spec** or **Vibe**).
2. The model writes `requirements.md` (EARS), `design.md`, `tasks.md`.
3. You approve each file.
4. **Run tasks** generates source for the stack you named (React, Python, Java, Go, C#, PHP, Rust, Ruby, Kotlin).
5. Explorer (left) / editor (center) / chat (right) / terminal (bottom).
6. The agent may run shell only after **Allow / Allow this workspace / Deny**.

It is **not** tied to a government product. Nidhi and Budget are separate apps; they connect later as MCP servers.

### Layout (Kiro / VS Code)

| Region | Role |
|---|---|
| Menu | File Edit Selection View Go Run Terminal Help |
| Explorer | Project folder + `.sutra/keybindings.json` |
| Editor | Specs and generated code, tabs |
| Chat | Spec / Vibe, history, presets |
| Terminal | cmd.exe (Windows) or zsh (macOS), approval card |
| Settings | Models, MCP, Keycloak, quotas |

---

## 2. Run it locally (web studio)

Prerequisites: Node 22, npm.

```bash
git clone https://github.com/ramuram234/sutra-ide.git
cd sutra-ide
npm ci
cp .env.example .env   # if you add one; or export vars in the shell
export XAI_API_KEY=... # or another provider, see §4
npm run dev            # http://127.0.0.1:8080
```

Production-like preview:

```bash
npm run build
npm run preview
```

Desktop window (after `npm run build`):

```bash
npx electron desktop/main.mjs
```

The Electron shell starts `vite preview` on port 7310 and opens a native window.

---

## 3. Environment variables (source of truth for secrets)

Never put API keys in the Settings UI. Settings store **URLs, model ids, client ids**. Secrets live in the process environment.

| Variable | Purpose |
|---|---|
| `XAI_API_KEY` | Default Grok / xAI |
| `SUTRA_MODEL_API_KEY` | Generic key for custom / vLLM / LiteLLM |
| `SUTRA_MODEL_BASE_URL` | If set, **overrides** the Settings default endpoint (OpenAI-compatible `/v1`) |
| `SUTRA_MODEL_ID` | Model name sent in `chat/completions` |
| `SUTRA_MODEL_MAX_TOKENS` | Cap per completion |
| `SUTRA_MONTHLY_TOKEN_LIMIT` | Hard monthly quota per user `sub` |
| `OPENAI_API_KEY` | OpenAI |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock bearer / LiteLLM in front of Bedrock |
| `OLLAMA_API_KEY` | Optional; Ollama usually needs none |
| `VITE_AUTH_ENABLED` | `"false"` keeps Grok preview auth off (shipped default) |

Desktop / CI inherit the same env. Put them in the OS user environment, systemd unit, or a secrets manager — not in git.

---

## 4. Onboard models

Sutra talks **OpenAI Chat Completions**: `POST {baseUrl}/chat/completions`. Almost every host can speak that.

Open **Settings → Models**. Enable one row, pick it as **Default model**. Set `baseUrl`, `model`, and `apiKeyEnv`. Restart the server after changing env keys.

### 4.1 xAI Grok (default)

```
kind: xai
baseUrl: https://api.x.ai/v1
model: grok-4.5
apiKeyEnv: XAI_API_KEY
```

### 4.2 OpenAI

```
kind: openai
baseUrl: https://api.openai.com/v1
model: gpt-4.1
apiKeyEnv: OPENAI_API_KEY
```

### 4.3 Ollama (laptop)

```
ollama pull llama3.1
# Settings:
kind: ollama
baseUrl: http://127.0.0.1:11434/v1
model: llama3.1
```

No key. Desktop installers can reach localhost; the hosted web preview cannot reach *your* laptop Ollama.

### 4.4 vLLM / any self-hosted LLM

```
python -m vllm.entrypoints.openai.api_server --model <hf-id> --api-key $SUTRA_MODEL_API_KEY
```

```
kind: vllm
baseUrl: http://GPU_HOST:8000/v1
model: <hf-id>
apiKeyEnv: SUTRA_MODEL_API_KEY
```

LM Studio: `http://127.0.0.1:1234/v1`. TGI, llama.cpp server, NVIDIA NIM, OpenRouter, Together, Fireworks: same shape.

### 4.5 AWS Bedrock

Two supported patterns:

**A. LiteLLM (recommended)** in front of Bedrock:

```bash
pip install 'litellm[proxy]'
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION_NAME=us-east-1
litellm --model bedrock/anthropic.claude-sonnet-4-20250514-v1:0 --port 4000
```

```
kind: bedrock
baseUrl: http://127.0.0.1:4000/v1
model: bedrock/anthropic.claude-sonnet-4-20250514-v1:0
apiKeyEnv: SUTRA_MODEL_API_KEY   # LiteLLM master key if you set one
```

**B. Bedrock OpenAI-compatible endpoint + bearer token** (IAM or Bedrock API key):

```
kind: bedrock
baseUrl: https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1
model: anthropic.claude-sonnet-4-20250514-v1:0
apiKeyEnv: AWS_BEARER_TOKEN_BEDROCK
```

Do not put AWS secret keys in the browser. IAM roles on the desktop box or a LiteLLM sidecar are the right boundary.

### 4.6 Azure OpenAI

```
kind: azure
baseUrl: https://{resource}.openai.azure.com/openai/v1
model: {deployment-name}
apiKeyEnv: AZURE_OPENAI_API_KEY
```

### 4.7 Force one model from env (ops)

```
SUTRA_MODEL_BASE_URL=https://llm.mycorp.internal/v1
SUTRA_MODEL_ID=corp-coder
SUTRA_MODEL_API_KEY=...
```

When `SUTRA_MODEL_BASE_URL` is set, it wins over Settings. Use this in Kubernetes.

Chat sends `modelId` (the Settings default) and `userId` (Keycloak `sub` or `anonymous`) on every spec request (`src/lib/sutra/generate.ts` → `src/lib/sutra/model-router.ts`).

---

## 5. MCP tools

Settings → **MCP**. Each row is a server:

- **stdio** (desktop / VS Code / IntelliJ host): `command` + `args`, e.g.  
  `npx -y @modelcontextprotocol/server-filesystem .`
- **HTTP** (remote): `url` such as `https://nidhi.example.gov/mcp`

Enable the row. The desktop app and the IDE extensions are the processes that **spawn** stdio MCP. The browser preview cannot spawn local processes except the allow-listed terminal.

Example `mcp.json` (same idea as Claude Desktop), stored in Settings and conceptually at `.sutra/mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "nidhi": { "url": "https://nidhi.internal/mcp" },
    "budget": { "url": "https://budget.internal/mcp" }
  }
}
```

Add HTTP MCP from Settings → MCP → **Add HTTP MCP**. Point Nidhi / Budget / knowledge servers here; Sutra stays a generic IDE.

---

## 6. Identity: should users sign in?

**Yes, if you bill tokens, attach MCP with private data, or ship to a department.** Anonymous is fine for a laptop demo.

Sutra does **not** call a random “login API” you invent. It uses **OpenID Connect** (Keycloak). After login you have a standard `id_token`. The subject (`sub`) is the quota key. Access tokens can be forwarded to MCP HTTP servers as `Authorization: Bearer`.

### 6.1 Keycloak client

1. Realm e.g. `sutra`.
2. Client `sutra-ide`, type **public**.
3. Standard flow + **PKCE** (S256). **No client secret** in the IDE.
4. Valid redirect URIs:
   - `http://127.0.0.1:8080/auth/callback`
   - `http://localhost:7310/auth/callback` (Electron)
   - `https://your-host/auth/callback`
5. Web origins: same hosts.
6. Optional: roles `sutra-user`, `sutra-admin`. Map `email`, `name`.

### 6.2 Settings → Identity

- Issuer: `https://keycloak.mycorp.example` (no `/realms/...` suffix)
- Realm: `sutra`
- Client id: `sutra-ide`
- Tick **Require Keycloak sign-in for model calls**
- **Sign in with Keycloak**

Flow: PKCE in the browser → Keycloak login → `/auth/callback` exchanges the code → `id_token` parsed → user stored in `sessionStorage` (`src/lib/sutra/identity.ts`). Chat then sends `userId=sub`.

**Sign out** clears that session. There is no password stored in Sutra.

### 6.3 Call APIs with the user token

MCP HTTP and your own backends should:

```
Authorization: Bearer <access_token>
```

Validate JWT against Keycloak JWKS (`…/realms/sutra/protocol/openid-connect/certs`). Do not accept unsigned user ids from the client for privileged MCP.

The studio currently keys **quota** on `sub` from the id_token. For production MCP, add the access_token to the MCP HTTP headers in the desktop host (next increment).

---

## 7. Token limits

Settings → **Quota**:

- **Monthly tokens** per user (`sub` or `anonymous`)
- **Per request max** (also `max_tokens` on the provider)

Env override: `SUTRA_MONTHLY_TOKEN_LIMIT`.

Implementation: `src/lib/sutra/quota.ts` (in-memory per process, keyed `userId:YYYY-MM`). Before a completion, Sutra checks remaining budget; after success it adds `usage.prompt + usage.completion`.

For multi-instance production, replace the `Map` with Redis or Postgres (`used_tokens` table). The function signatures stay (`getQuota`, `addUsage`, `assertQuota`).

When the cap is hit the chat returns an error; raise the cap or wait for the next calendar month.

Warn-at-percent is stored for UI; wire a banner if you need it.

---

## 8. Keyboard shortcuts

**File → Preferences: Keyboard Shortcuts** or **Alt+K**. Search, click a key, press the new chord. JSON tab is user overrides (Kiro/VS Code style). Defaults + overrides: `src/lib/sutra/keymap.ts`.

Command Palette: **Alt+P**. Go to file: **Alt+O**. Terminal: **Ctrl+`**. Run: **F5**. Chrome steals Ctrl+N/W/L; use Alt chords in the browser.

---

## 9. Languages

Name the stack in the prompt. Specs are language-agnostic; `src/lib/sutra/codegen.ts` emits:

| Prompt | Files |
|---|---|
| (default) React | Form.tsx + Express |
| Python / FastAPI | models.py, main.py |
| Java / Spring | Controller.java |
| Go | main.go |
| C# / PHP / Rust / Ruby / Kotlin | matching sources |

---

## 10. Build installers (Windows + Mac)

Installers are **not** produced inside the Linux web preview. GitHub Actions (`.github/workflows/release.yml`) builds them.

1. Push to `main` or run **Actions → Release → Run workflow**.
2. Artifacts:
   - Windows NSIS `Sutra-Setup-*.exe` + portable
   - macOS `Sutra-*-mac.dmg` + zip
   - VS Code `.vsix`
   - IntelliJ plugin zip

Locally **on that OS**:

```bash
npm install
npm run dist:win    # Windows
npm run dist:mac    # macOS
# output: release/
```

Electron config: `electron-builder.yml`, entry `desktop/main.mjs`.

Code signing: add Apple / Windows certs as GitHub secrets later; unsigned builds still install with an OS warning.

---

## 11. Extensions

### VS Code

```bash
cd extensions/vscode
npm i
npx tsc -p .
npx @vscode/vsce package --allow-missing-repository --skip-license
```

VS Code → Extensions → … → **Install from VSIX**. Commands: **Sutra: Write specs**, **Sutra: Run command in terminal** (Allow / Deny, then `cmd.exe` / zsh).

### IntelliJ IDEA / WebStorm

```bash
cd extensions/intellij
gradle buildPlugin
```

**Settings → Plugins → Install Plugin from Disk** → `build/distributions/*.zip`. **Tools → Sutra: Write specs**.

---

## 12. Source map (where to change things)

| Concern | Path |
|---|---|
| Chat / Spec / Vibe | `src/components/studio/chat-thread.tsx` |
| IDE chrome | `src/components/studio/studio-app.tsx` |
| Keymap | `src/lib/sutra/keymap.ts` |
| Model HTTP | `src/lib/sutra/model-router.ts` |
| Spec generation | `src/lib/sutra/generate.ts` |
| Stacks / codegen | `src/lib/sutra/codegen.ts` |
| Permissions / terminal | `src/lib/sutra/permissions.ts`, `run-command.ts` |
| Platform Settings | `src/lib/sutra/platform-config.ts`, `src/routes/settings.tsx` |
| Keycloak PKCE | `src/lib/sutra/oidc.ts`, `src/routes/auth.callback.tsx` |
| Quota | `src/lib/sutra/quota.ts` |
| Electron | `desktop/main.mjs` |
| CI | `.github/workflows/release.yml` |

---

## 13. Recommended production shape

```
[User] → Sutra desktop/web
            → Keycloak (OIDC)
            → model-router → LiteLLM → Bedrock / vLLM / xAI
            → quota (Redis)
            → MCP HTTP (Nidhi, Budget, knowledge) with access_token
```

Laptop developers: Ollama or LM Studio, Keycloak off, quota high.

Department deploy: Keycloak on, `SUTRA_MODEL_BASE_URL` to the corporate LiteLLM, monthly cap per user, MCP only over HTTPS.

---

## 14. Security notes

- API keys: environment only.
- Keycloak: public client + PKCE; never embed a client secret in the web or VS Code extension.
- Shell: hardcoded deny for `rm`, `sudo`, `curl`, etc. (`permissions.ts`).
- Do not send PII in prompts beyond the task.
- Token quota is per `sub`; do not trust a client-supplied user id for MCP authorization — validate JWT.
