export type Effect = "deny" | "ask" | "allow";
export type RuleScope = "kiro" | "user" | "workspace" | "session";
export type Capability = "shell" | "fs_read" | "fs_write";

export type PermissionRule = {
  capability: Capability;
  match?: string[];
  exclude?: string[];
  effect: Effect;
  scope: RuleScope;
};

/** Hardcoded invariants — cannot be overridden by allow. */
export const KIRO_INVARIANTS: PermissionRule[] = [
  {
    capability: "shell",
    match: [
      "rm *",
      "rmdir *",
      "sudo *",
      "chmod *",
      "chown *",
      "mkfs *",
      "format *",
      "del *",
      "Remove-Item *",
      "curl *",
      "wget *",
      "ssh *",
      "kill *",
      "powershell *",
      "pwsh *",
      "cmd *",
      "bash -c *",
      "sh -c *",
      "start *",
      "msiexec *",
      "rundll32 *",
      "wscript *",
      "cscript *",
      "certutil *",
      "bitsadmin *",
      "reg *",
    ],
    effect: "deny",
    scope: "kiro",
  },
  {
    capability: "fs_write",
    match: ["*.env", "**/.env", "mcp.json", "**/mcp.json", ".git/**", "*.pem", "*.key", "*.p12"],
    effect: "deny",
    scope: "kiro",
  },
];

/** Built-in defaults: read-only inspection is allowed; everything else asks. */
export const DEFAULT_RULES: PermissionRule[] = [
  {
    capability: "shell",
    match: [
      "git status*",
      "git log*",
      "git diff*",
      "git --version",
      "node --version",
      "pwd",
      "whoami",
      "hostname",
      "uname *",
      "date",
      "ls *",
      "ls",
      "dir",
      "dir *",
      "cat *",
      "type *",
      "echo *",
      "clear",
      "cls",
    ],
    effect: "allow",
    scope: "kiro",
  },
  { capability: "fs_read", effect: "allow", scope: "kiro" },
  { capability: "fs_write", match: ["src/**", "specs/**"], effect: "allow", scope: "kiro" },
];

const RANK: Record<Effect, number> = { allow: 0, ask: 1, deny: 2 };

function globToRegExp(pattern: string) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, ".*")
    .replace(/\0/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

export function matches(pattern: string, value: string) {
  return globToRegExp(pattern.trim()).test(value.trim());
}

function ruleApplies(rule: PermissionRule, capability: Capability, resource: string) {
  if (rule.capability !== capability) return false;
  const include = !rule.match?.length || rule.match.some((p) => matches(p, resource));
  if (!include) return false;
  if (rule.exclude?.some((p) => matches(p, resource))) return false;
  return true;
}

export function evaluate(
  capability: Capability,
  resource: string,
  extra: PermissionRule[] = [],
): { effect: Effect; rule?: PermissionRule } {
  const all = [...KIRO_INVARIANTS, ...DEFAULT_RULES, ...extra];
  const hit = all.filter((r) => ruleApplies(r, capability, resource));
  if (!hit.length) return { effect: "ask" };
  hit.sort((a, b) => RANK[b.effect] - RANK[a.effect]);
  return { effect: hit[0]!.effect, rule: hit[0] };
}

export function patternSuggestions(command: string): string[] {
  const parts = command.trim().split(/\s+/);
  const bin = parts[0] ?? command;
  const exact = command.trim();
  const base = `${bin} *`;
  const out = [exact];
  if (parts.length > 1 && base !== exact) out.push(base);
  if (!out.includes("*")) out.push("*");
  return out;
}

export function rulesToYaml(rules: PermissionRule[]) {
  if (!rules.length) return "rules: []\n";
  const lines = ["rules:"];
  for (const r of rules) {
    lines.push(`  - capability: ${r.capability}`);
    lines.push(`    effect: ${r.effect}`);
    if (r.match?.length) {
      lines.push("    match:");
      for (const m of r.match) lines.push(`      - ${m}`);
    }
    lines.push(`    # scope: ${r.scope}`);
  }
  return lines.join("\n") + "\n";
}

export function proposeCommand(query: string, os: "windows" | "macos"): string | null {
  const q = query.trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const bins = ["node", "npm", "npx", "git", "ls", "dir", "cat", "type", "pwd", "whoami", "hostname", "python", "python3", "echo", "mkdir", "md", "cd", "uname", "date", "clear", "cls"];
  const first = lower.split(/\s+/)[0] ?? "";
  if (bins.includes(first)) return q;
  if (/(node|runtime).*(version|ver)|version of node/.test(lower)) return "node --version";
  if (/npm/.test(lower) && /version/.test(lower)) return "npm --version";
  if (/(list|show|see).*(file|dir|folder)|directory|what.?s in/.test(lower)) return os === "windows" ? "dir" : "ls -la";
  if (/git status|what branch|uncommitted/.test(lower)) return "git status";
  if (/who am i|username/.test(lower)) return "whoami";
  if (/where am i|working dir|cwd|pwd/.test(lower)) return "pwd";
  return null;
}

const USER_KEY = "sutra.permissions.user";
const WS_KEY = "sutra.permissions.workspace";

export function loadPersisted(): { user: PermissionRule[]; workspace: Record<string, PermissionRule[]> } {
  if (typeof localStorage === "undefined") return { user: [], workspace: {} };
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? "[]") as PermissionRule[];
    const workspace = JSON.parse(localStorage.getItem(WS_KEY) ?? "{}") as Record<string, PermissionRule[]>;
    return { user, workspace };
  } catch {
    return { user: [], workspace: {} };
  }
}

export function savePersisted(user: PermissionRule[], workspace: Record<string, PermissionRule[]>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(WS_KEY, JSON.stringify(workspace));
}
