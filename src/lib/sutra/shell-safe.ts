import path from "node:path";

export const ALLOWED_BINS = new Set([
  "node",
  "npm",
  "npx",
  "python3",
  "python",
  "git",
  "ls",
  "dir",
  "cat",
  "type",
  "echo",
  "mkdir",
  "md",
  "pwd",
  "whoami",
  "hostname",
  "uname",
  "date",
  "clear",
  "cls",
  "cd",
]);

const PROTECTED = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\./i,
  /(^|\/)mcp\.json$/i,
  /(^|\/)permissions\.ya?ml$/i,
  /(^|\/)\.git(\/|$)/i,
  /\.(pem|key|p12|pfx)$/i,
  /(^|\/)\.sutra\/\.env$/i,
];

export function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: '"' | "'" | null = null;
  for (const ch of input.trim()) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function contained(root: string, target: string) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

export function safeRel(p: string) {
  const n = p.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!n || n.startsWith("/") || n.includes("..") || path.isAbsolute(p)) return null;
  if (n.includes("\0")) return null;
  return n;
}

export function isProtectedRel(rel: string) {
  const n = rel.replaceAll("\\", "/");
  return PROTECTED.some((re) => re.test(n));
}

export function hasMetacharacters(command: string) {
  return /[;|&`$<>]/.test(command);
}

/** Drop `.` and empty PATH entries so Windows does not resolve a planted exe in cwd (CVE-class). */
export function safePathEnv(raw: string | undefined) {
  return (raw ?? "")
    .split(path.delimiter)
    .filter((p) => p && p !== "." && p !== "./")
    .join(path.delimiter);
}

export function npmSubcommandOk(cmd: string | undefined) {
  return !cmd || ["--version", "-v", "init", "install", "ls", "run", "view"].includes(cmd);
}

export function gitSubcommandOk(cmd: string | undefined) {
  return (
    !cmd ||
    ["--version", "status", "log", "diff", "init", "add", "commit", "branch", "restore", "stash"].includes(cmd)
  );
}
