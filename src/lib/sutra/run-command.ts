import { createServerFn } from "@tanstack/react-start";
import {
  ALLOWED_BINS,
  contained,
  gitSubcommandOk,
  hasMetacharacters,
  isProtectedRel,
  npmSubcommandOk,
  safePathEnv,
  safeRel,
  tokenize,
} from "./shell-safe";

export type ShellOs = "windows" | "macos";

async function nodeHost() {
  const m = await import("./node-host.server");
  return m.nodeHost();
}

function workspaceRoot(os: typeof import("node:os"), path: typeof import("node:path")) {
  return (
    process.env.SUTRA_WORKSPACE?.trim() ||
    path.join(process.env.USERPROFILE || process.env.HOME || os.homedir() || os.tmpdir(), "Sutra", "workspace")
  );
}

function hostOs(): ShellOs {
  return process.platform === "win32" ? "windows" : "macos";
}

function spawnSpec(rawBin: string, rest: string[], os: ShellOs): { bin: string; args: string[] } {
  if (os === "windows") {
    if (["dir", "type", "cls", "md", "mkdir", "echo", "pwd"].includes(rawBin)) {
      const inner = rawBin === "pwd" ? "cd" : rawBin === "mkdir" ? "md" : rawBin;
      return { bin: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", inner, ...rest] };
    }
    if (rawBin === "ls") return { bin: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "dir", ...rest] };
    if (rawBin === "cat") return { bin: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "type", ...rest] };
    const name = rawBin === "python3" ? "python" : rawBin;
    const bin = name === "npm" || name === "npx" ? `${name}.cmd` : name === "node" ? "node.exe" : name;
    return { bin, args: rest };
  }
  if (rawBin === "dir") return { bin: "ls", args: ["-la", ...rest] };
  if (rawBin === "type") return { bin: "cat", args: rest };
  if (rawBin === "md") return { bin: "mkdir", args: ["-p", ...rest] };
  if (rawBin === "cls") return { bin: "clear", args: rest };
  if (rawBin === "python") return { bin: "python3", args: rest };
  return { bin: rawBin, args: rest };
}

async function spawnCapture(bin: string, args: string[], cwd: string, timeoutMs = 12_000) {
  const { spawn } = await nodeHost();
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(bin, args, {
      cwd,
      env: {
        ...process.env,
        PATH: safePathEnv(process.env.Path || process.env.PATH),
        HOME: process.env.HOME,
        LANG: process.env.LANG || "C.UTF-8",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += String(d);
      if (stdout.length > 12_000) stdout = stdout.slice(0, 12_000) + "\n…truncated";
    });
    child.stderr?.on("data", (d) => {
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
  const host = await nodeHost();
  try {
    const raw = (await host.fs.readFile(host.path.join(root, ".sutra-cwd"), "utf8")).trim();
    const rel = safeRel(raw) ?? ".";
    const full = host.path.resolve(root, rel);
    if (!contained(root, full)) return root;
    return full;
  } catch {
    return root;
  }
}

export const desktopHealth = createServerFn({ method: "GET" }).handler(async () => {
  const host = await nodeHost();
  return {
    platform: process.platform,
    workspace: workspaceRoot(host.os, host.path),
    node: process.version,
    keys: {
      XAI_API_KEY: Boolean(process.env.XAI_API_KEY?.trim()),
      SUTRA_MODEL_API_KEY: Boolean(process.env.SUTRA_MODEL_API_KEY?.trim()),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
  };
});

export const runShellCommand = createServerFn({ method: "POST" })
  .validator((input: { slug: string; command: string; os: ShellOs; files?: { path: string; code: string }[] }) => {
    const slug = input.slug.trim().toLowerCase();
    const command = input.command.trim();
    if (!/^[a-z0-9][a-z0-9-]{0,48}$/.test(slug)) throw new Error("Invalid project slug.");
    if (!command || command.length > 240) throw new Error("Command is empty or too long.");
    if (hasMetacharacters(command) && !command.startsWith("__init__")) {
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
    const host = await nodeHost();
    const { path } = host;
    const os = hostOs();
    const root = path.join(workspaceRoot(host.os, path), data.slug);
    await host.fs.mkdir(root, { recursive: true });

    if (data.command === "__init__" || data.files.length) {
      for (const f of data.files) {
        const rel = safeRel(f.path);
        if (!rel || isProtectedRel(rel)) continue;
        const dest = path.join(root, rel);
        if (!contained(root, dest)) continue;
        await host.fs.mkdir(path.dirname(dest), { recursive: true });
        await host.fs.writeFile(dest, f.code, "utf8");
      }
      if (data.command === "__init__") {
        return {
          ok: true as const,
          stdout: `Wrote ${data.files.length} files into ${root}`,
          stderr: "",
          code: 0,
          cwd: ".",
        };
      }
    }

    const tokens = tokenize(data.command);
    const rawBin = (tokens[0] ?? "").toLowerCase();
    if (!ALLOWED_BINS.has(rawBin)) {
      return {
        ok: false as const,
        stdout: "",
        stderr: `'${rawBin}' is not allowed.`,
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
      if (!contained(root, next)) {
        return { ok: false as const, stdout: "", stderr: "cd: outside project", code: 1, cwd: "." };
      }
      await host.fs.writeFile(path.join(root, ".sutra-cwd"), path.relative(root, next) || ".", "utf8");
      return { ok: true as const, stdout: "", stderr: "", code: 0, cwd: path.relative(root, next) || "." };
    }

    if (rawBin === "clear" || rawBin === "cls") {
      return { ok: true as const, stdout: "", stderr: "", code: 0, cwd: path.relative(root, cwd) || ".", clear: true };
    }

    const rest = tokens.slice(1);
    if ((rawBin === "npm" || rawBin === "npx") && !npmSubcommandOk(rest[0])) {
      return { ok: false as const, stdout: "", stderr: "npm/npx: only --version, init, install, ls, run", code: 126, cwd: "." };
    }
    if (rawBin === "npx" && rest[0] && rest[0] !== "--version") {
      return { ok: false as const, stdout: "", stderr: "npx: only --version in this studio", code: 126, cwd: "." };
    }
    if (rawBin === "git" && !gitSubcommandOk(rest[0])) {
      return { ok: false as const, stdout: "", stderr: "git: only --version, status, log, diff", code: 126, cwd: "." };
    }

    const spec = spawnSpec(rawBin, rest, os);
    const timeout = rawBin === "npm" && rest[0] === "install" ? 40_000 : 12_000;
    const result = await spawnCapture(spec.bin, spec.args, cwd, timeout);
    return {
      ok: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      cwd: path.relative(root, cwd) || ".",
    };
  });
