import { useEffect, useMemo, useState } from "react";
import {
  ACTION_META,
  DEFAULT_BINDINGS,
  eventToKey,
  keybindingsJson,
  saveUserBindings,
  type IdeAction,
  type Keybinding,
} from "@/lib/sutra/keymap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function KeybindingsEditor({
  user,
  onChange,
}: {
  user: Keybinding[];
  onChange: (next: Keybinding[]) => void;
}) {
  const [q, setQ] = useState("");
  const [recording, setRecording] = useState<IdeAction | null>(null);
  const [tab, setTab] = useState<"ui" | "json">("ui");
  const [json, setJson] = useState(() => keybindingsJson(user));

  const rows = useMemo(() => {
    return ACTION_META.filter(
      (a) =>
        !q ||
        a.label.toLowerCase().includes(q.toLowerCase()) ||
        a.id.toLowerCase().includes(q.toLowerCase()),
    );
  }, [q]);

  function keysFor(id: IdeAction) {
    const fromUser = user.filter((b) => b.command === id).map((b) => b.key);
    if (fromUser.length) return fromUser;
    return DEFAULT_BINDINGS.filter((b) => b.command === id).map((b) => b.key);
  }

  function setBinding(command: IdeAction, key: string) {
    const next = [...user.filter((b) => b.command !== command), { key, command }];
    onChange(next);
    saveUserBindings(next);
    setJson(keybindingsJson(next));
  }

  function reset(command: IdeAction) {
    const next = user.filter((b) => b.command !== command);
    onChange(next);
    saveUserBindings(next);
    setJson(keybindingsJson(next));
  }

  useEffect(() => {
    if (!recording) return;
    const command = recording;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      const key = eventToKey(e);
      if (!key) return;
      setBinding(command, key);
      setRecording(null);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, user]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-xs text-muted">.sutra/keybindings.json</p>
        <span className="flex-1" />
        <button
          type="button"
          className={`h-8 rounded-sm px-2 text-xs ${tab === "ui" ? "bg-raised" : "text-muted"}`}
          onClick={() => setTab("ui")}
        >
          Editor
        </button>
        <button
          type="button"
          className={`h-8 rounded-sm px-2 text-xs ${tab === "json" ? "bg-raised" : "text-muted"}`}
          onClick={() => setTab("json")}
        >
          JSON
        </button>
      </div>
      {tab === "json" ? (
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <Textarea
            className="min-h-0 flex-1 font-mono text-xs"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <Button
            className="mt-2"
            size="sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(json) as Keybinding[];
                if (!Array.isArray(parsed)) throw new Error("array");
                onChange(parsed);
                saveUserBindings(parsed);
              } catch {
                /* keep */
              }
            }}
          >
            Save JSON
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-border p-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search commands…"
            />
            <p className="mt-2 text-xs text-subtle">
              Click a key, then press the shortcut. Same as Kiro: Preferences → Keyboard Shortcuts.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="px-3 py-2">Command</th>
                  <th>Keybinding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p>{a.label}</p>
                      <p className="font-mono text-xs text-subtle">
                        {a.category} · {a.id}
                      </p>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="h-8 rounded-sm bg-surface px-2 font-mono text-xs"
                        onClick={() => setRecording(a.id)}
                      >
                        {recording === a.id ? "Press a key…" : keysFor(a.id).slice(0, 2).join("  or  ")}
                      </button>
                    </td>
                    <td className="pr-3">
                      <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => reset(a.id)}>
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {recording ? <p className="border-t border-border px-3 py-2 text-xs text-warn">Press a key for {recording}…</p> : null}
    </div>
  );
}
