import { Lock, RotateCw } from "lucide-react";
import type { ModuleSpec } from "@/lib/sutra/schema";
import { ModulePlayer } from "@/components/studio/module-player";

export function BrowserPreview({ spec }: { spec: ModuleSpec }) {
  const url = `http://localhost:5173/${spec.slug}`;
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg p-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warn/70" />
          <span className="size-2.5 rounded-full bg-ok/70" />
          <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-full bg-bg px-3 py-1.5 text-xs text-muted">
            <Lock className="size-3 shrink-0" />
            <span className="truncate font-mono">{url}</span>
          </div>
          <RotateCw className="size-3.5 text-subtle" aria-hidden />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ModulePlayer spec={spec} />
        </div>
      </div>
    </div>
  );
}
