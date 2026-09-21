/**
 * Debug Adapter Protocol (DAP) — same protocol VS Code uses.
 * Node spawn stays inside the server handler so the browser bundle never loads child_process.
 */
import { createServerFn } from "@tanstack/react-start";
import { registerFolder } from "./workspace-io";

type Session = { pid: number; file: string; inspect: string };

const sessions = new Map<string, Session>();

export const debugLaunch = createServerFn({ method: "POST" })
  .validator((input: { folder: string; file: string }) => ({
    folder: input.folder,
    file: input.file.replaceAll("\\", "/"),
  }))
  .handler(async ({ data }) => {
    const { spawn } = await (await import("./node-host.server")).nodeHost();
    const registered = await registerFolder({ data: { folder: data.folder } });
    const target = `${registered.folder}/${data.file}`.replaceAll("//", "/");
    const isWin = process.platform === "win32";
    const child = spawn(isWin ? "node.exe" : "node", ["--inspect-brk=9229", target], {
      cwd: registered.folder,
      stdio: "pipe",
      windowsHide: true,
    });
    if (child.pid) sessions.set(String(child.pid), { pid: child.pid, file: data.file, inspect: "127.0.0.1:9229" });
    let out = "";
    child.stderr?.on("data", (b) => {
      out += String(b);
    });
    await new Promise((r) => setTimeout(r, 400));
    return {
      ok: true as const,
      pid: child.pid ?? 0,
      inspect: "127.0.0.1:9229",
      file: data.file,
      log: out.slice(0, 2000) || `Debugger listening — attach Chrome to ${target}`,
    };
  });

export const debugStop = createServerFn({ method: "POST" })
  .validator((input: { pid: number }) => ({ pid: input.pid }))
  .handler(async ({ data }) => {
    const s = sessions.get(String(data.pid));
    if (s) {
      try {
        process.kill(s.pid);
      } catch {
        /* already dead */
      }
      sessions.delete(String(data.pid));
    }
    return { ok: true as const };
  });
