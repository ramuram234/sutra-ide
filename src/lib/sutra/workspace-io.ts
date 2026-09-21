import { createServerFn } from "@tanstack/react-start";
import { contained, isProtectedRel, safePathEnv, safeRel, tokenize, hasMetacharacters, ALLOWED_BINS } from "./shell-safe";

const SKIP = new Set(["node_modules", ".git", "dist", "release", ".vercel"]);

export type DirEntry = { path: string; name: string; dir: boolean };
export type GitChange = { path: string; status: string; staged: boolean };
export type GitSnapshot = { repo: boolean; branch: string; changes: GitChange[]; ahead: string };

async function nodeHost() {
  const m = await import("./node-host.server");
  return m.nodeHost();
}

function defaultRoot(os: { homedir: () => string }, path: typeof import("node:path")) {
  return (
    process.env.SUTRA_WORKSPACE?.trim() ||
    path.join(process.env.USERPROFILE || process.env.HOME || os.homedir(), "Sutra", "workspace")
  );
}

async function loadFolders(host: Awaited<ReturnType<typeof nodeHost>>): Promise<string[]> {
  try {
    const file = host.path.join(host.os.homedir(), ".sutra", "folders.json");
    const raw = JSON.parse(await host.fs.readFile(file, "utf8")) as { folders?: string[] };
    return (raw.folders ?? []).map((f) => host.path.resolve(f));
  } catch {
    return [];
  }
}

async function saveFolders(host: Awaited<ReturnType<typeof nodeHost>>, folders: string[]) {
  const file = host.path.join(host.os.homedir(), ".sutra", "folders.json");
  await host.fs.mkdir(host.path.dirname(file), { recursive: true });
  await host.fs.writeFile(file, JSON.stringify({ folders }, null, 2));
}

function underHome(home: string, abs: string) {
  return contained(home, abs);
}

function blocked(abs: string) {
  const n = abs.toLowerCase().replaceAll("\\", "/");
  return n.includes("/windows/") || n.includes("/system32") || n.startsWith("/etc") || n.includes("/.ssh");
}

async function assertFolder(folder: string) {
  const host = await nodeHost();
  const abs = host.path.resolve(folder);
  const home = host.os.homedir();
  if (blocked(abs) || !underHome(home, abs)) throw new Error("Folder is outside your home directory.");
  const allowed = [host.path.resolve(defaultRoot(host.os, host.path)), ...(await loadFolders(host))];
  if (!allowed.some((root) => abs === root || contained(root, abs) || contained(abs, root))) {
    throw new Error("Folder is not in the workspace. Use File → Open Folder first.");
  }
  return abs;
}

async function walk(dir: string, root: string, out: DirEntry[], depth: number) {
  if (out.length > 400 || depth > 6) return;
  const host = await nodeHost();
  let names: string[] = [];
  try {
    names = await host.fs.readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = host.path.join(dir, name);
    let st;
    try {
      st = await host.fs.stat(full);
    } catch {
      continue;
    }
    const rel = host.path.relative(root, full).replaceAll("\\", "/");
    out.push({ path: rel, name, dir: st.isDirectory() });
    if (st.isDirectory()) await walk(full, root, out, depth + 1);
  }
}

export const workspaceInfo = createServerFn({ method: "GET" }).handler(async () => {
  const host = await nodeHost();
  const home = defaultRoot(host.os, host.path);
  await host.fs.mkdir(home, { recursive: true });
  const folders = await loadFolders(host);
  return { home, folders: folders.length ? folders : [home] };
});

export const registerFolder = createServerFn({ method: "POST" })
  .validator((input: { folder: string; create?: boolean }) => ({
    folder: input.folder.trim(),
    create: Boolean(input.create),
  }))
  .handler(async ({ data }) => {
    const host = await nodeHost();
    const abs = host.path.resolve(data.folder.startsWith("~") ? data.folder.replace(/^~/, host.os.homedir()) : data.folder);
    if (!host.path.isAbsolute(data.folder) && !data.folder.startsWith("~")) {
      const nested = host.path.resolve(defaultRoot(host.os, host.path), data.folder);
      if (blocked(nested) || !underHome(host.os.homedir(), nested)) throw new Error("Invalid folder.");
      if (data.create) await host.fs.mkdir(nested, { recursive: true });
      const folders = Array.from(new Set([...(await loadFolders(host)), nested]));
      await saveFolders(host, folders);
      return { folder: nested, folders };
    }
    if (blocked(abs) || !underHome(host.os.homedir(), abs)) throw new Error("Folder is outside your home directory.");
    if (data.create) await host.fs.mkdir(abs, { recursive: true });
    const folders = Array.from(new Set([...(await loadFolders(host)), abs]));
    await saveFolders(host, folders);
    return { folder: abs, folders };
  });

export const listFolder = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    const abs = await assertFolder(data.folder);
    const entries: DirEntry[] = [];
    await walk(abs, abs, entries, 0);
    return { folder: abs, entries };
  });

export const readWorkspaceFile = createServerFn({ method: "POST" })
  .validator((input: { folder: string; rel: string }) => ({ folder: input.folder, rel: input.rel }))
  .handler(async ({ data }) => {
    const host = await nodeHost();
    const root = await assertFolder(data.folder);
    const rel = safeRel(data.rel);
    if (!rel) throw new Error("Invalid path.");
    const dest = host.path.join(root, rel);
    if (!contained(root, dest)) throw new Error("Path outside folder.");
    const content = await host.fs.readFile(dest, "utf8");
    return { path: rel, content: content.slice(0, 400_000) };
  });

export const writeWorkspaceFile = createServerFn({ method: "POST" })
  .validator((input: { folder: string; rel: string; content: string }) => ({
    folder: input.folder,
    rel: input.rel,
    content: String(input.content).slice(0, 400_000),
  }))
  .handler(async ({ data }) => {
    const host = await nodeHost();
    const root = await assertFolder(data.folder);
    const rel = safeRel(data.rel);
    if (!rel || isProtectedRel(rel)) throw new Error("Cannot write that file.");
    const dest = host.path.join(root, rel);
    if (!contained(root, dest)) throw new Error("Path outside folder.");
    await host.fs.mkdir(host.path.dirname(dest), { recursive: true });
    await host.fs.writeFile(dest, data.content, "utf8");
    return { ok: true as const, path: rel };
  });

function gitBin() {
  return process.platform === "win32" ? "git.exe" : "git";
}

async function git(cwd: string, args: string[]) {
  const host = await nodeHost();
  try {
    const { stdout, stderr } = await host.execFile(gitBin(), args, {
      cwd,
      timeout: 15_000,
      windowsHide: true,
      env: { ...process.env, PATH: safePathEnv(process.env.Path || process.env.PATH) },
    });
    return { ok: true as const, stdout: String(stdout), stderr: String(stderr) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false as const, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? e.message ?? "git failed") };
  }
}

export const gitSnapshot = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    const cwd = await assertFolder(data.folder);
    const inside = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (!inside.ok) return { repo: false, branch: "", changes: [], ahead: "" } satisfies GitSnapshot;
    const branch = await git(cwd, ["branch", "--show-current"]);
    const st = await git(cwd, ["status", "--porcelain", "-uall"]);
    const changes: GitChange[] = [];
    for (const line of st.stdout.split("\n")) {
      if (line.length < 4) continue;
      const x = line[0] ?? " ";
      const y = line[1] ?? " ";
      const p = line.slice(3).replace(/^"/, "").replace(/"$/, "");
      changes.push({ path: p, status: (x + y).trim() || "M", staged: x !== " " && x !== "?" });
    }
    return { repo: true, branch: branch.stdout.trim() || "HEAD", changes, ahead: "" } satisfies GitSnapshot;
  });

export const gitInitFolder = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    const cwd = await assertFolder(data.folder);
    return git(cwd, ["init"]);
  });

export const gitStage = createServerFn({ method: "POST" })
  .validator((input: { folder: string; paths: string[]; unstage?: boolean }) => ({
    folder: input.folder,
    paths: input.paths.slice(0, 80),
    unstage: Boolean(input.unstage),
  }))
  .handler(async ({ data }) => {
    const cwd = await assertFolder(data.folder);
    const rels = data.paths
      .map((p) => safeRel(p))
      .filter((p): p is string => p !== null && !isProtectedRel(p));
    if (!rels.length) return { ok: false as const, stdout: "", stderr: "Nothing to stage." };
    return git(cwd, data.unstage ? ["restore", "--staged", "--", ...rels] : ["add", "--", ...rels]);
  });

export const gitCommitFolder = createServerFn({ method: "POST" })
  .validator((input: { folder: string; message: string; name?: string; email?: string }) => ({
    folder: input.folder,
    message: input.message.trim().slice(0, 200),
    name: (input.name ?? "").trim().slice(0, 80),
    email: (input.email ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data }) => {
    if (!data.message) throw new Error("Commit message required.");
    const cwd = await assertFolder(data.folder);
    const args = ["commit", "-m", data.message];
    if (data.name) args.unshift("-c", `user.name=${data.name}`);
    if (data.email) args.unshift("-c", `user.email=${data.email}`);
    return git(cwd, args);
  });

export async function execInFolder(folder: string, command: string) {
  const host = await nodeHost();
  const cwd = await assertFolder(folder);
  if (hasMetacharacters(command)) return { ok: false as const, stdout: "", stderr: "Pipes and chaining are blocked." };
  const tokens = tokenize(command);
  const bin = (tokens[0] ?? "").toLowerCase();
  if (!ALLOWED_BINS.has(bin)) return { ok: false as const, stdout: "", stderr: `'${bin}' is not allowed.` };
  const args = tokens.slice(1);
  const exe = process.platform === "win32" && (bin === "npm" || bin === "npx") ? `${bin}.cmd` : bin === "python3" && process.platform === "win32" ? "python" : bin;
  try {
    const r = await host.execFile(exe, args, {
      cwd,
      timeout: 20_000,
      windowsHide: true,
      env: { ...process.env, PATH: safePathEnv(process.env.Path || process.env.PATH) },
    });
    return { ok: true as const, stdout: String(r.stdout).slice(0, 8000), stderr: String(r.stderr).slice(0, 4000) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false as const, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? e.message ?? "failed") };
  }
}
