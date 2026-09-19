import { useEffect, useRef, useState } from "react";
import { Loader2, SquareTerminal } from "lucide-react";
import { generateFiles } from "@/lib/sutra/codegen";
import { proposeCommand } from "@/lib/sutra/permissions";
import { runShellCommand, type ShellOs } from "@/lib/sutra/run-command";
import { useSutra } from "@/lib/sutra/store";
import { ApprovalCard } from "@/components/studio/approval-card";
import { cn } from "@/lib/utils";

function promptFor(os: ShellOs, slug: string) {
  return os === "windows" ? `C:\\Users\\dev\\${slug}>` : `dev@sutra ${slug} %`;
}

function chips(os: ShellOs, slug: string) {
  if (os === "windows") {
    return ["dir", "node --version", "npm --version", `type src\\server\\${slug}.ts`];
  }
  return ["ls -la", "node --version", "npm --version", `cat src/server/${slug}.ts`];
}

export function TerminalPane({ compact }: { compact?: boolean }) {
  const spec = useSutra((s) => s.spec);
  const os = useSutra((s) => s.os);
  const setOs = useSutra((s) => s.setOs);
  const lines = useSutra((s) => s.termLines);
  const push = useSutra((s) => s.pushTerm);
  const clear = useSutra((s) => s.clearTerm);
  const busy = useSutra((s) => s.termBusy);
  const setBusy = useSutra((s) => s.setTermBusy);
  const decide = useSutra((s) => s.decideShell);
  const setPending = useSutra((s) => s.setPending);
  const pending = useSutra((s) => s.pending);
  const [value, setValue] = useState("");
  const [ask, setAsk] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const slug = spec?.slug ?? "project";

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lines.length, pending]);

  async function runNow(cmd: string) {
    if (!spec) return;
    setPending(null);
    push({ kind: "in", text: `${promptFor(os, slug)} ${cmd}` });
    setBusy(true);
    try {
      const files = generateFiles(spec);
      const res = await runShellCommand({
        data: { slug, command: cmd, os, files: lines.length < 2 ? files : undefined },
      });
      if ("clear" in res && res.clear) {
        clear();
        return;
      }
      if (res.stdout) push({ kind: "out", text: res.stdout.replace(/\n$/, "") });
      if (res.stderr) push({ kind: "err", text: res.stderr.replace(/\n$/, "") });
      if (!res.stdout && !res.stderr && res.code === 0) push({ kind: "sys", text: "(ok)" });
    } catch (err) {
      push({ kind: "err", text: err instanceof Error ? err.message : "Command failed" });
    } finally {
      setBusy(false);
    }
  }

  function requestRun(cmd: string, query?: string) {
    const command = cmd.trim();
    if (!command || busy || !spec) return;
    const effect = decide(command, slug);
    if (effect === "deny") {
      push({ kind: "err", text: `Denied by permissions: ${command}` });
      setPending(null);
      return;
    }
    if (effect === "allow") {
      void runNow(command);
      return;
    }
    setPending({ command, query });
  }

  return (
    <div className={cn("flex min-h-0 flex-col bg-[#1a1b18]", compact ? "h-72" : "flex-1")}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <SquareTerminal className="size-3.5 text-muted" />
        <p className="text-xs text-muted">{os === "windows" ? "Command Prompt" : "zsh"}</p>
        <span className="flex-1" />
        <button
          type="button"
          className={cn("h-7 rounded-sm px-2 text-[11px]", os === "windows" ? "bg-raised text-fg" : "text-muted")}
          onClick={() => setOs("windows")}
        >
          Windows
        </button>
        <button
          type="button"
          className={cn("h-7 rounded-sm px-2 text-[11px]", os === "macos" ? "bg-raised text-fg" : "text-muted")}
          onClick={() => setOs("macos")}
        >
          macOS
        </button>
      </div>
      <form
        className="flex gap-2 border-b border-border px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = ask.trim();
          if (!q) return;
          const cmd = proposeCommand(q, os);
          setAsk("");
          if (!cmd) {
            push({ kind: "sys", text: `Could not map “${q}” to a command. Try “list files” or type the command below.` });
            return;
          }
          requestRun(cmd, q);
        }}
      >
        <input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          className="h-8 min-w-0 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-subtle"
          placeholder="Ask Sutra to do something — e.g. list files, check node version"
          disabled={busy || !!pending}
        />
        <button type="submit" className="h-8 shrink-0 text-[11px] text-muted hover:text-fg" disabled={busy || !!pending}>
          Ask
        </button>
      </form>
      <ApprovalCard
        onAllow={(cmd) => void runNow(cmd)}
        onDeny={(cmd) => {
          push({ kind: "sys", text: `Denied: ${cmd}` });
          setPending(null);
        }}
      />
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
        {lines.length === 0 && !pending ? (
          <p className="text-subtle">
            Agent commands need approval (Allow · Always allow · Deny). Read-only git and version checks can be pre-allowed.
          </p>
        ) : null}
        {lines.map((l, i) => (
          <pre
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              l.kind === "in" && "text-fg",
              l.kind === "out" && "text-muted",
              l.kind === "err" && "text-danger",
              l.kind === "sys" && "text-subtle",
            )}
          >
            {l.text}
          </pre>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
        {chips(os, slug).map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy || !!pending}
            onClick={() => requestRun(c)}
            className="h-7 rounded-full bg-raised px-2.5 font-mono text-[11px] text-muted hover:text-fg"
          >
            {c}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t border-border px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          const cmd = value.trim();
          setValue("");
          requestRun(cmd);
        }}
      >
        <span className="shrink-0 font-mono text-[11px] text-ok">{promptFor(os, slug)}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 min-w-0 flex-1 bg-transparent font-mono text-xs text-fg outline-none"
          placeholder={os === "windows" ? "dir" : "ls"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy || !!pending}
        />
        {busy ? <Loader2 className="size-3.5 animate-spin text-muted" /> : null}
      </form>
    </div>
  );
}

export async function bootTerminal(specSlug: string, os: ShellOs, files: { path: string; code: string }[]) {
  const { pushTerm, setTermBusy, clearTerm, setPending, decideShell } = useSutra.getState();
  clearTerm();
  setTermBusy(true);
  try {
    pushTerm({ kind: "sys", text: "Wrote generated files. Agent needs approval to inspect the runtime." });
    const res = await runShellCommand({
      data: { slug: specSlug, command: "__init__", os, files },
    });
    if (res.stdout) pushTerm({ kind: "sys", text: res.stdout });
    const inspect = "npm --version";
    const effect = decideShell(inspect, specSlug);
    if (effect === "allow") {
      const ver = await runShellCommand({ data: { slug: specSlug, command: inspect, os } });
      pushTerm({ kind: "in", text: `${promptFor(os, specSlug)} ${inspect}` });
      if (ver.stdout) pushTerm({ kind: "out", text: ver.stdout.trim() });
    } else if (effect === "deny") {
      pushTerm({ kind: "err", text: `Denied: ${inspect}` });
    } else {
      setPending({ command: inspect, query: "Check npm so the agent can install dependencies later" });
    }
  } catch (err) {
    pushTerm({ kind: "err", text: err instanceof Error ? err.message : "Terminal failed to start" });
  } finally {
    setTermBusy(false);
  }
}
