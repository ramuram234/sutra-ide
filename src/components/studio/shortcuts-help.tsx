import { SHORTCUT_ROWS } from "@/lib/sutra/keymap";
import type { ShellOs } from "@/lib/sutra/schema";
import { Button } from "@/components/ui/button";

export function ShortcutsHelp({
  os,
  onClose,
}: {
  os: ShellOs;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="keys-title"
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-md bg-raised p-5 shadow-[var(--shadow-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="keys-title" className="font-display text-2xl tracking-tight">
          Keyboard shortcuts
        </h2>
        <p className="mt-2 text-sm text-muted">
          Detected {os === "macos" ? "macOS" : "Windows"}. Copy / paste / undo stay with the browser while you
          type. Chrome owns Ctrl+N, Ctrl+W, and Ctrl+L — use Alt keys in this preview. The desktop IDE and
          VS Code / JetBrains extensions can take the full Ctrl/⌘ map.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-subtle">
              <th className="py-2">Action</th>
              <th>This browser</th>
              <th>Desktop IDE</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_ROWS.map((row) => (
              <tr key={row.action} className="border-t border-border">
                <td className="py-2">{row.label}</td>
                <td className="font-mono text-xs text-muted">{row.browser}</td>
                <td className="font-mono text-xs text-muted">{row.desktop}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button className="mt-4" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
