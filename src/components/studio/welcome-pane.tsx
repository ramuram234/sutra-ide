import { SutraMark } from "@/components/studio/sutra-mark";

const ROWS: { label: string; keys: string[] }[] = [
  { label: "Open Folder", keys: ["Ctrl", "K", "O"] },
  { label: "Open chat", keys: ["Ctrl", "Shift", "L"] },
  { label: "Show All Commands", keys: ["Ctrl", "Shift", "P"] },
  { label: "Go to File", keys: ["Ctrl", "P"] },
  { label: "Find in Files", keys: ["Ctrl", "Shift", "F"] },
  { label: "Start Debugging", keys: ["F5"] },
  { label: "Toggle Terminal", keys: ["Ctrl", "`"] },
  { label: "Toggle Full Screen", keys: ["F11"] },
  { label: "Show Settings", keys: ["Ctrl", ","] },
];

export function WelcomePane({ onCommand }: { onCommand?: (label: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-auto px-6 py-10">
      <div className="flex items-center gap-3 text-fg">
        <SutraMark className="size-14 text-fg" />
        <p className="font-display text-4xl tracking-[0.2em]">SUTRA</p>
      </div>
      <dl className="grid w-full max-w-md gap-3">
        {ROWS.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4">
            <button
              type="button"
              onClick={() => onCommand?.(row.label)}
              className="text-right text-sm text-muted hover:text-fg"
            >
              {row.label}
            </button>
            <dd className="flex gap-1">
              {row.keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-8 rounded-sm bg-raised px-2 py-1 text-center font-mono text-xs text-muted shadow-[var(--shadow-border)]"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-subtle">In this browser: Alt+P commands · Alt+L chat · Ctrl+` terminal · Alt+K keys</p>
    </div>
  );
}
