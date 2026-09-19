import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gitCommitFolder, gitInitFolder, gitSnapshot, gitStage, type GitSnapshot } from "@/lib/sutra/workspace-io";
import { loadGitUser } from "@/lib/sutra/git-user";

export function ScmPanel({
  folder,
  onOpen,
}: {
  folder: string | null;
  onOpen: (rel: string) => void;
}) {
  const [snap, setSnap] = useState<GitSnapshot | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!folder) return;
    setSnap(await gitSnapshot({ data: { folder } }));
  }

  useEffect(() => {
    void refresh();
  }, [folder]);

  if (!folder) {
    return <p className="px-3 py-2 text-xs text-subtle">Open a folder to use Source Control.</p>;
  }

  async function initRepo() {
    setBusy(true);
    setErr(null);
    const r = await gitInitFolder({ data: { folder: folder! } });
    if (!r.ok) setErr(r.stderr);
    await refresh();
    setBusy(false);
  }

  async function commit() {
    setBusy(true);
    setErr(null);
    const user = loadGitUser();
    const r = await gitCommitFolder({
      data: { folder: folder!, message: msg, name: user.name, email: user.email },
    });
    if (!r.ok) setErr(r.stderr || r.stdout);
    else setMsg("");
    await refresh();
    setBusy(false);
  }

  async function toggle(path: string, staged: boolean) {
    await gitStage({ data: { folder: folder!, paths: [path], unstage: staged } });
    await refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium tracking-widest text-subtle">
        <GitBranch className="size-3.5" /> SOURCE CONTROL
      </p>
      {!snap?.repo ? (
        <div className="grid gap-2 px-3">
          <p className="text-xs text-muted">This folder is not a Git repository.</p>
          <Button size="sm" disabled={busy} onClick={() => void initRepo()}>
            Initialize Repository
          </Button>
        </div>
      ) : (
        <>
          <p className="px-3 text-xs text-muted">{snap.branch || "main"}</p>
          <textarea
            className="mx-2 mt-2 h-16 resize-none rounded-sm bg-raised p-2 text-xs outline-none"
            placeholder="Message (Ctrl+Enter to commit)"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void commit();
            }}
          />
          <div className="px-2 py-2">
            <Button size="sm" className="w-full" disabled={busy || !msg.trim()} onClick={() => void commit()}>
              Commit
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {snap.changes.length === 0 ? (
              <p className="px-2 text-xs text-subtle">No changes.</p>
            ) : (
              snap.changes.map((c) => (
                <label key={c.path} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-raised">
                  <input type="checkbox" checked={c.staged} onChange={() => void toggle(c.path, c.staged)} />
                  <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => onOpen(c.path)}>
                    {c.path}
                  </button>
                  <span className="font-mono text-subtle">{c.status}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
      {err ? <p className="px-3 py-2 text-xs text-danger">{err}</p> : null}
    </div>
  );
}
