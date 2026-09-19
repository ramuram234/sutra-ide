import { useEffect, useMemo, useState } from "react";
import { ACTION_META, type IdeAction } from "@/lib/sutra/keymap";
import { Input } from "@/components/ui/input";

export function CommandPalette({
  onRun,
  onClose,
}: {
  onRun: (id: IdeAction) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const items = useMemo(() => {
    const t = q.toLowerCase();
    return ACTION_META.filter((a) => !t || a.label.toLowerCase().includes(t) || a.id.includes(t));
  }, [q]);

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
              onRun(items[i]!.id);
              onClose();
            }
          }}
        />
        <ul className="max-h-80 overflow-auto py-1">
          {items.map((a, idx) => (
            <li key={a.id}>
              <button
                type="button"
                className={`flex h-9 w-full items-center justify-between px-3 text-left text-sm ${
                  idx === i ? "bg-surface" : ""
                }`}
                onMouseEnter={() => setI(idx)}
                onClick={() => {
                  onRun(a.id);
                  onClose();
                }}
              >
                <span>{a.label}</span>
                <span className="text-xs text-subtle">{a.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
