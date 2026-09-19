import { X } from "lucide-react";
import { TerminalPane } from "@/components/studio/terminal-pane";
import type { PanelTab } from "@/lib/sutra/workbench";
import { cn } from "@/lib/utils";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "output", label: "Output" },
  { id: "debug", label: "Debug Console" },
  { id: "terminal", label: "Terminal" },
  { id: "ports", label: "Ports / MCP" },
];

export function BottomPanel({
  tab,
  onTab,
  onClose,
  problems,
  output,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  problems: { file: string; message: string; severity: "error" | "warning" }[];
  output: string;
}) {
  return (
    <div className="flex h-48 shrink-0 flex-col border-t border-border">
      <div className="flex h-8 items-center gap-1 border-b border-border px-1 text-xs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn("h-7 rounded-sm px-2", tab === t.id ? "bg-raised text-fg" : "text-subtle")}
          >
            {t.label}
            {t.id === "problems" && problems.length ? ` ${problems.length}` : ""}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="px-2 text-subtle" aria-label="Close panel">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "terminal" || tab === "ports" ? (
          <TerminalPane compact />
        ) : tab === "problems" ? (
          <ul className="p-2 text-xs">
            {problems.length === 0 ? (
              <li className="text-subtle">No problems have been detected.</li>
            ) : (
              problems.map((p, i) => (
                <li key={i} className={p.severity === "error" ? "text-danger" : "text-warn"}>
                  {p.file}: {p.message}
                </li>
              ))
            )}
          </ul>
        ) : tab === "debug" ? (
          <p className="p-3 text-xs text-subtle">Debug Console — F5 starts the generated preview / tasks. Breakpoints are not attached yet.</p>
        ) : (
          <pre className="p-3 font-mono text-[11px] text-muted">{output || "Sutra output channel."}</pre>
        )}
      </div>
    </div>
  );
}
