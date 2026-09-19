import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type MenuItem = { label: string; shortcut?: string; onSelect?: () => void; sep?: boolean };

export function MenuBar({
  menus,
}: {
  menus: { id: string; label: string; items: MenuItem[] }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header ref={root} className="flex h-8 items-center gap-0.5 border-b border-border bg-[var(--color-activity)] px-1">
      <span className="w-2" />
      {menus.map((m) => (
        <div key={m.id} className="relative">
          <button
            type="button"
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onMouseEnter={() => {
              if (open) setOpen(m.id);
            }}
            className={cn(
              "h-7 rounded-sm px-2 text-xs",
              open === m.id ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            {m.label}
          </button>
          {open === m.id ? (
            <ul className="absolute top-full left-0 z-30 min-w-52 rounded-sm bg-raised py-1 shadow-[var(--shadow-border)]">
              {m.items.map((item, i) =>
                item.sep ? (
                  <li key={i} className="my-1 border-t border-border" />
                ) : (
                  <li key={`${item.label}-${i}`}>
                    <button
                      type="button"
                      disabled={!item.onSelect}
                      onClick={() => {
                        item.onSelect?.();
                        setOpen(null);
                      }}
                      className="flex h-8 w-full items-center justify-between gap-6 px-3 text-xs text-fg hover:bg-surface disabled:text-subtle"
                    >
                      <span>{item.label}</span>
                      {item.shortcut ? <span className="text-subtle">{item.shortcut}</span> : null}
                    </button>
                  </li>
                ),
              )}
            </ul>
          ) : null}
        </div>
      ))}
      <span className="flex-1" />
      <button
        type="button"
        onClick={() => navigate({ to: "/extensions" })}
        className="h-7 rounded-sm px-2 text-xs text-muted hover:text-fg"
      >
        VS Code + JetBrains
      </button>
    </header>
  );
}
