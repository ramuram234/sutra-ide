import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PLATFORM,
  kindHint,
  loadPlatform,
  savePlatform,
  type ModelEndpoint,
  type ModelProviderKind,
  type PlatformConfig,
} from "@/lib/sutra/platform-config";
import { keycloakAuthUrl, pkcePair } from "@/lib/sutra/oidc";
import { displayName, loadUser, saveUser } from "@/lib/sutra/identity";
import { listModelStatus } from "@/lib/sutra/model-router";
import { desktopHealth } from "@/lib/sutra/run-command";
import { loadGitUser, saveGitUser, type GitUser } from "@/lib/sutra/git-user";
import { ThemePicker } from "@/components/studio/theme-picker";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const KINDS: ModelProviderKind[] = [
  "xai",
  "openai",
  "ollama",
  "vllm",
  "lmstudio",
  "azure",
  "bedrock",
  "custom",
];

function SettingsPage() {
  const [cfg, setCfg] = useState<PlatformConfig>(DEFAULT_PLATFORM);
  const [tab, setTab] = useState<"appearance" | "models" | "git" | "mcp">("appearance");
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [health, setHealth] = useState<{ platform: string; workspace: string; node: string; keys: Record<string, boolean> } | null>(null);

  useEffect(() => {
    setCfg(loadPlatform());
    void listModelStatus().then(setKeys);
    void desktopHealth().then(setHealth);
  }, []);

  function persist(next: PlatformConfig) {
    setCfg(next);
    savePlatform(next);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader active="settings" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <p className="font-display text-3xl tracking-tight">Settings</p>
          <p className="mt-2 text-sm text-muted">
            Theme, models you connect, Git name for commits. No admin, identity server, or quota
            screens — this is the user IDE.
          </p>
          <p className="mt-2 text-xs">
            <Link to="/guide" className="text-accent underline">
              Full developer guide
            </Link>
          </p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {(["appearance", "models", "git", "mcp"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 rounded-sm px-3 text-xs capitalize ${tab === t ? "bg-raised" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "appearance" ? (
          <section className="grid gap-4">
            <p className="text-sm text-muted">
              Color mode applies immediately. System default tracks Windows / macOS. The desktop app also
              updates the native window chrome.
            </p>
            <ThemePicker />
            {health ? (
              <p className="rounded-md bg-raised p-3 font-mono text-xs text-muted">
                runtime {health.platform} · node {health.node}
                <br />
                workspace {health.workspace}
                <br />
                keys {Object.entries(health.keys).map(([k, v]) => `${k}=${v ? "yes" : "no"}`).join(" · ")}
              </p>
            ) : null}
            <p className="text-xs text-subtle">
              Installed .exe / .dmg: the IDE server runs on this computer (no extra Node install). Put API
              keys in <code>%USERPROFILE%\\.sutra\\.env</code> (Windows) or <code>~/.sutra/.env</code>{" "}
              (macOS), e.g. <code>XAI_API_KEY=…</code>. Workspace files: <code>~/Sutra/workspace</code>.
            </p>
          </section>
        ) : null}
        {tab === "models" ? <ModelsTab cfg={cfg} persist={persist} keys={keys} /> : null}
        {tab === "git" ? <GitTab /> : null}
        {tab === "mcp" ? <McpTab cfg={cfg} persist={persist} /> : null}
      </main>
    </div>
  );
}

function ModelsTab({
  cfg,
  persist,
  keys,
}: {
  cfg: PlatformConfig;
  persist: (c: PlatformConfig) => void;
  keys: Record<string, boolean>;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        Default model
        <select
          className="h-10 rounded-sm bg-raised px-3"
          value={cfg.defaultModelId}
          onChange={(e) => persist({ ...cfg, defaultModelId: e.target.value })}
        >
          {cfg.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-subtle">
        Keys present on the server:{" "}
        {Object.entries(keys)
          .map(([k, v]) => `${k}=${v ? "yes" : "no"}`)
          .join(" · ") || "loading…"}
      </p>
      {cfg.models.map((m, i) => (
        <article key={m.id} className="grid gap-2 rounded-md bg-raised p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{m.label}</p>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={m.enabled}
                onChange={(e) => {
                  const models = cfg.models.slice();
                  models[i] = { ...m, enabled: e.target.checked };
                  persist({ ...cfg, models });
                }}
              />
              enabled
            </label>
          </div>
          <p className="text-xs text-subtle">{kindHint(m.kind)}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Field
              label="Kind"
              value={m.kind}
              onChange={(v) => patchModel(cfg, persist, i, { kind: v as ModelProviderKind })}
              select={KINDS}
            />
            <Field label="Model id" value={m.model} onChange={(v) => patchModel(cfg, persist, i, { model: v })} />
            <Field
              label="Base URL"
              value={m.baseUrl}
              onChange={(v) => patchModel(cfg, persist, i, { baseUrl: v })}
            />
            <Field
              label="API key env var"
              value={m.apiKeyEnv}
              onChange={(v) => patchModel(cfg, persist, i, { apiKeyEnv: v })}
            />
          </div>
        </article>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          persist({
            ...cfg,
            models: [
              ...cfg.models,
              {
                id: `m-${Date.now()}`,
                label: "Custom endpoint",
                kind: "custom",
                baseUrl: "http://127.0.0.1:8000/v1",
                model: "my-model",
                apiKeyEnv: "SUTRA_MODEL_API_KEY",
                maxTokens: 4096,
                enabled: true,
              } satisfies ModelEndpoint,
            ],
          })
        }
      >
        Add model endpoint
      </Button>
    </div>
  );
}

function patchModel(
  cfg: PlatformConfig,
  persist: (c: PlatformConfig) => void,
  i: number,
  patch: Partial<ModelEndpoint>,
) {
  const models = cfg.models.slice();
  models[i] = { ...models[i]!, ...patch };
  persist({ ...cfg, models });
}

function Field({
  label,
  value,
  onChange,
  select,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  select?: string[];
}) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      {select ? (
        <select className="h-10 rounded-sm bg-surface px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          {select.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function McpTab({ cfg, persist }: { cfg: PlatformConfig; persist: (c: PlatformConfig) => void }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        MCP servers Sutra can attach. stdio runs on the desktop/extension host. HTTP is for remote
        MCP (knowledge, Nidhi, Budget). Toggle enabled, then restart the desktop app.
      </p>
      {cfg.mcp.map((s, i) => (
        <article key={s.id} className="grid gap-2 rounded-md bg-raised p-4">
          <label className="flex items-center justify-between text-sm">
            {s.name}
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => {
                const mcp = cfg.mcp.slice();
                mcp[i] = { ...s, enabled: e.target.checked };
                persist({ ...cfg, mcp });
              }}
            />
          </label>
          <Input
            value={s.url ?? `${s.command} ${(s.args ?? []).join(" ")}`}
            onChange={(e) => {
              const mcp = cfg.mcp.slice();
              const v = e.target.value;
              mcp[i] = v.startsWith("http") ? { ...s, transport: "http", url: v } : { ...s, command: v };
              persist({ ...cfg, mcp });
            }}
          />
        </article>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          persist({
            ...cfg,
            mcp: [
              ...cfg.mcp,
              { id: `mcp-${Date.now()}`, name: "http-mcp", transport: "http", url: "http://127.0.0.1:3333/mcp", enabled: true },
            ],
          })
        }
      >
        Add HTTP MCP
      </Button>
    </div>
  );
}

function GitTab() {
  const [user, setUser] = useState<GitUser>({ name: "", email: "" });
  useEffect(() => setUser(loadGitUser()), []);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Used only for Git commits from Source Control. Not an admin login.</p>
      <label className="grid gap-1 text-sm">
        Name
        <Input
          value={user.name}
          onChange={(e) => {
            const next = { ...user, name: e.target.value };
            setUser(next);
            saveGitUser(next);
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <Input
          value={user.email}
          onChange={(e) => {
            const next = { ...user, email: e.target.value };
            setUser(next);
            saveGitUser(next);
          }}
        />
      </label>
    </div>
  );
}

function IdentityTab({ cfg, persist }: { cfg: PlatformConfig; persist: (c: PlatformConfig) => void }) {
  const k = cfg.keycloak;
  async function signIn() {
    const { verifier, challenge } = await pkcePair();
    const state = crypto.randomUUID();
    sessionStorage.setItem("sutra.pkce", JSON.stringify({ verifier, state, issuer: k.issuer, realm: k.realm, clientId: k.clientId }));
    const redirectUri = `${window.location.origin}${k.redirectPath}`;
    window.location.href = keycloakAuthUrl({
      issuer: k.issuer,
      realm: k.realm,
      clientId: k.clientId,
      redirectUri,
      challenge,
      state,
    });
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Keycloak public client + PKCE. Create client <code>sutra-ide</code>, Standard flow, no
        secret, redirect {k.redirectPath}. Users sign in; token usage is billed to their{" "}
        <code>sub</code>.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={k.enabled}
          onChange={(e) => persist({ ...cfg, keycloak: { ...k, enabled: e.target.checked } })}
        />
        Require Keycloak sign-in for model calls
      </label>
      <Field label="Issuer" value={k.issuer} onChange={(v) => persist({ ...cfg, keycloak: { ...k, issuer: v } })} />
      <Field label="Realm" value={k.realm} onChange={(v) => persist({ ...cfg, keycloak: { ...k, realm: v } })} />
      <Field label="Client id" value={k.clientId} onChange={(v) => persist({ ...cfg, keycloak: { ...k, clientId: v } })} />
      <div className="flex gap-2">
        <Button onClick={() => void signIn()} disabled={!k.enabled}>
          Sign in with Keycloak
        </Button>
        <Button variant="secondary" onClick={() => saveUser(null)}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function QuotaTab({ cfg, persist }: { cfg: PlatformConfig; persist: (c: PlatformConfig) => void }) {
  const q = cfg.quota;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Monthly cap per signed-in user (anonymous if not signed in). Server env{" "}
        <code>SUTRA_MONTHLY_TOKEN_LIMIT</code> overrides this.
      </p>
      <label className="grid gap-1 text-xs">
        Monthly tokens
        <Input
          type="number"
          value={q.monthlyTokenLimit}
          onChange={(e) => persist({ ...cfg, quota: { ...q, monthlyTokenLimit: Number(e.target.value) || 0 } })}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Per request max
        <Input
          type="number"
          value={q.perRequestMaxTokens}
          onChange={(e) => persist({ ...cfg, quota: { ...q, perRequestMaxTokens: Number(e.target.value) || 0 } })}
        />
      </label>
      <Textarea
        readOnly
        className="min-h-24 font-mono text-xs"
        value={`SUTRA_MONTHLY_TOKEN_LIMIT=${q.monthlyTokenLimit}\nSUTRA_MODEL_MAX_TOKENS=${q.perRequestMaxTokens}`}
      />
    </div>
  );
}
