import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";

const ROOT = "/tmp/sutra-work";

const ALLOW = new Set([
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

export type ShellOs = "windows" | "macos";

function slugOk(slug: string) {
  return /^[a-z0-9][a-z0-9-]{0,48}$/.test(slug);
}

function tokenize(input: string): string[] {
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

function mapBin(bin: string): { bin: string; argsPrefix: string[] } {
  if (bin === "dir") return { bin: "ls", argsPrefix: ["-la"] };
  if (bin === "type") return { bin: "cat", argsPrefix: [] };
  if (bin === "md") return { bin: "mkdir", argsPrefix: ["-p"] };
  if (bin === "cls") return { bin: "clear", argsPrefix: [] };
  if (bin === "python") return { bin: "python3", argsPrefix: [] };
  return { bin, argsPrefix: [] };
}

function safeRel(p: string) {
  const n = p.replaceAll("\\", "/");
  if (!n || n.startsWith("/") || n.includes("..")) return null;
  return n;
}

function spawnCapture(bin: string, args: string[], cwd: string, timeoutMs = 12_000) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(bin, args, {
      cwd,
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: cwd, LANG: "C.UTF-8" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
      if (stdout.length > 12_000) stdout = stdout.slice(0, 12_000) + "\n…truncated";
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 8_000) stderr = stderr.slice(0, 8_000) + "\n…truncated";
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ code: 124, stdout, stderr: stderr + "\n(timed out)" });
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(t);
      resolve({ code: 127, stdout, stderr: err.message });
    });
  });
}

async function cwdOf(root: string) {
  try {
    const raw = (await readFile(path.join(root, ".sutra-cwd"), "utf8")).trim();
    const rel = safeRel(raw) ?? ".";
    const full = path.resolve(root, rel);
    if (!full.startsWith(root)) return root;
    return full;
  } catch {
    return root;
  }
}

export const runShellCommand = createServerFn({ method: "POST" })
  .validator((input: { slug: string; command: string; os: ShellOs; files?: { path: string; code: string }[] }) => {
    const slug = input.slug.trim().toLowerCase();
    const command = input.command.trim();
    if (!slugOk(slug)) throw new Error("Invalid project slug.");
    if (!command || command.length > 240) throw new Error("Command is empty or too long.");
    if (/[;|&`$<>]/.test(command) && !command.startsWith("__init__")) {
      throw new Error("Pipes, redirects and chaining are blocked.");
    }
    const os: ShellOs = input.os === "windows" ? "windows" : "macos";
    const files = (input.files ?? []).slice(0, 8).map((f) => ({
      path: f.path,
      code: f.code.slice(0, 40_000),
    }));
    return { slug, command, os, files };
  })
  .handler(async ({ data }) => {
    const root = path.join(ROOT, data.slug);
    await mkdir(root, { recursive: true });

    if (data.command === "__init__" || data.files.length) {
      for (const f of data.files) {
        const rel = safeRel(f.path);
        if (!rel) continue;
        const dest = path.join(root, rel);
        if (!dest.startsWith(root)) continue;
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, f.code, "utf8");
      }
      if (data.command === "__init__") {
        return {
          ok: true as const,
          stdout: `Wrote ${data.files.length} files into project ${data.slug}`,
          stderr: "",
          code: 0,
          cwd: ".",
        };
      }
    }

    const tokens = tokenize(data.command);
    const rawBin = (tokens[0] ?? "").toLowerCase();
    if (!ALLOW.has(rawBin)) {
      return {
        ok: false as const,
        stdout: "",
        stderr: `'${rawBin}' is not allowed. Try node, npm, ls/dir, cat/type, mkdir, pwd, git --version.`,
        code: 126,
        cwd: ".",
      };
    }

    let cwd = await cwdOf(root);

    if (rawBin === "cd") {
      const target = tokens[1] ?? ".";
      const rel = target === "." || target === "~" ? "." : safeRel(target);
      if (!rel) {
        return { ok: false as const, stdout: "", stderr: "cd: path not allowed", code: 1, cwd: path.relative(root, cwd) || "." };
      }
      const next = path.resolve(cwd, rel);
      if (!next.startsWith(root)) {
        return { ok: false as const, stdout: "", stderr: "cd: outside project", code: 1, cwd: "." };
      }
      await writeFile(path.join(root, ".sutra-cwd"), path.relative(root, next) || ".", "utf8");
      return { ok: true as const, stdout: "", stderr: "", code: 0, cwd: path.relative(root, next) || "." };
    }

    if (rawBin === "clear" || rawBin === "cls") {
      return { ok: true as const, stdout: "", stderr: "", code: 0, cwd: path.relative(root, cwd) || ".", clear: true };
    }

    const mapped = mapBin(rawBin);
    const rest = tokens.slice(1);
    if (mapped.bin === "npm" && rest[0] && !["--version", "-v", "init", "install", "ls", "run", "view"].includes(rest[0])) {
      return { ok: false as const, stdout: "", stderr: "npm: only --version, init, install, ls, run", code: 126, cwd: "." };
    }
    if (mapped.bin === "npx" && rest[0] && rest[0] !== "--version") {
      return { ok: false as const, stdout: "", stderr: "npx: only --version in this studio", code: 126, cwd: "." };
    }
    if (mapped.bin === "git" && rest[0] && !["--version", "status", "log"].includes(rest[0])) {
      return { ok: false as const, stdout: "", stderr: "git: only --version, status, log", code: 126, cwd: "." };
    }

    const args = [...mapped.argsPrefix, ...rest].map((a) => {
      if (a.includes("\\") && !a.startsWith("-")) return a.replaceAll("\\", "/");
      return a;
    });

    const timeout = mapped.bin === "npm" && rest[0] === "install" ? 40_000 : 12_000;
    const result = await spawnCapture(mapped.bin, args, cwd, timeout);
    return {
      ok: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      cwd: path.relative(root, cwd) || ".",
    };
  });
