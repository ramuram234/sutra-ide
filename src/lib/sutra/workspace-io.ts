import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createServerFn } from "@tanstack/react-start";
import { contained, isProtectedRel, safePathEnv, safeRel } from "./shell-safe";

const execFileAsync = promisify(execFile);
const SKIP = new Set(["node_modules", ".git", "dist", "release", ".vercel"]);

export type DirEntry = { path: string; name: string; dir: boolean };
export type GitChange = { path: string; status: string; staged: boolean };
export type GitSnapshot = { repo: boolean; branch: string; changes: GitChange[]; ahead: string };

function defaultRoot() {
  return (
    process.env.SUTRA_WORKSPACE?.trim() ||
    path.join(process.env.USERPROFILE || process.env.HOME || homedir(), "Sutra", "workspace")
  );
}

function foldersFile() {
  return path.join(homedir(), ".sutra", "folders.json");
}

async function loadFolders(): Promise<string[]> {
  try {
    const raw = JSON.parse(await readFile(foldersFile(), "utf8")) as { folders?: string[] };
    return (raw.folders ?? []).map((f) => path.resolve(f));
  } catch {
    return [];
  }
}

async function saveFolders(folders: string[]) {
  await mkdir(path.dirname(foldersFile()), { recursive: true });
  await writeFile(foldersFile(), JSON.stringify({ folders }, null, 2));
}

function underHome(abs: string) {
  return contained(homedir(), abs);
}

function blocked(abs: string) {
  const n = abs.toLowerCase().replaceAll("\\", "/");
  return n.includes("/windows/") || n.includes("/system32") || n.startsWith("/etc") || n.includes("/.ssh");
}

async function assertFolder(folder: string) {
  const abs = path.resolve(folder);
  if (blocked(abs) || !underHome(abs)) throw new Error("Folder is outside your home directory.");
  const allowed = [path.resolve(defaultRoot()), ...(await loadFolders())];
  if (!allowed.some((root) => abs === root || contained(root, abs) || contained(abs, root))) {
    throw new Error("Folder is not in the workspace. Use File → Open Folder first.");
  }
  return abs;
}

async function walk(dir: string, root: string, out: DirEntry[], depth: number) {
  if (out.length > 400 || depth > 6) return;
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = await stat(full);
    } catch {
      continue;
    }
    const rel = path.relative(root, full).replaceAll("\\", "/");
    out.push({ path: rel, name, dir: st.isDirectory() });
    if (st.isDirectory()) await walk(full, root, out, depth + 1);
  }
}

export const workspaceInfo = createServerFn({ method: "GET" }).handler(async () => {
  const home = defaultRoot();
  await mkdir(home, { recursive: true });
  const folders = await loadFolders();
  return { home, folders: folders.length ? folders : [home] };
});

export const registerFolder = createServerFn({ method: "POST" })
  .validator((input: { folder: string; create?: boolean }) => ({
    folder: input.folder.trim(),
    create: Boolean(input.create),
  }))
  .handler(async ({ data }) => {
    const abs = path.resolve(data.folder.startsWith("~") ? data.folder.replace(/^~/, homedir()) : data.folder);
    if (!path.isAbsolute(data.folder) && !data.folder.startsWith("~")) {
      const nested = path.resolve(defaultRoot(), data.folder);
      if (blocked(nested) || !underHome(nested)) throw new Error("Invalid folder.");
      if (data.create) await mkdir(nested, { recursive: true });
      const folders = Array.from(new Set([...(await loadFolders()), nested]));
      await saveFolders(folders);
      return { folder: nested, folders };
    }
    if (blocked(abs) || !underHome(abs)) throw new Error("Folder is outside your home directory.");
    if (data.create) await mkdir(abs, { recursive: true });
    const folders = Array.from(new Set([...(await loadFolders()), abs]));
    await saveFolders(folders);
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
    const root = await assertFolder(data.folder);
    const rel = safeRel(data.rel);
    if (!rel) throw new Error("Invalid path.");
    const dest = path.join(root, rel);
    if (!contained(root, dest)) throw new Error("Path outside folder.");
    const content = await readFile(dest, "utf8");
    return { path: rel, content: content.slice(0, 400_000) };
  });

export const writeWorkspaceFile = createServerFn({ method: "POST" })
  .validator((input: { folder: string; rel: string; content: string }) => ({
    folder: input.folder,
    rel: input.rel,
    content: String(input.content).slice(0, 400_000),
  }))
  .handler(async ({ data }) => {
    const root = await assertFolder(data.folder);
    const rel = safeRel(data.rel);
    if (!rel || isProtectedRel(rel)) throw new Error("Cannot write that file.");
    const dest = path.join(root, rel);
    if (!contained(root, dest)) throw new Error("Path outside folder.");
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, data.content, "utf8");
    return { ok: true as const, path: rel };
  });

function gitBin() {
  return process.platform === "win32" ? "git.exe" : "git";
}

async function git(cwd: string, args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync(gitBin(), args, {
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
