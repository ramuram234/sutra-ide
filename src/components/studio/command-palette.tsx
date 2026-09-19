import { useEffect, useMemo, useState } from "react";
import { searchCommands } from "@/lib/sutra/commands";
import type { IdeAction } from "@/lib/sutra/keymap";
import { Input } from "@/components/ui/input";

export function CommandPalette({
  onRun,
  onClose,
}: {
  onRun: (id: string, mapsTo?: IdeAction) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const items = useMemo(() => searchCommands(q), [q]);

  useEffect(() => {
    setI(0);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 p-8" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-md bg-raised shadow-[var(--shadow-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          autoFocus
          value={q}
          placeholder="Type a command (Ctrl+Shift+P)"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setI((n) => Math.min(items.length - 1, n + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setI((n) => Math.max(0, n - 1));
            }
            if (e.key === "Enter" && items[i]) {
              onRun(items[i]!.id, items[i]!.mapsTo);
              onClose();
            }
          }}
        />
        <ul className="max-h-80 overflow-auto py-1">
          {items.map((a, idx) => (
            <li key={a.id}>
              <button
                type="button"
                className={`flex h-9 w-full items-center justify-between gap-4 px-3 text-left text-sm ${
                  idx === i ? "bg-surface" : ""
                }`}
                onMouseEnter={() => setI(idx)}
                onClick={() => {
                  onRun(a.id, a.mapsTo);
                  onClose();
                }}
              >
                <span>{a.label}</span>
                <span className="shrink-0 text-[10px] text-subtle">{a.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
