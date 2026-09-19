import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { patternSuggestions, type RuleScope } from "@/lib/sutra/permissions";
import { useSutra } from "@/lib/sutra/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApprovalCard({
  onAllow,
  onDeny,
}: {
  onAllow: (command: string) => void;
  onDeny: (command: string) => void;
}) {
  const pending = useSutra((s) => s.pending);
  const persistOpen = useSutra((s) => s.persistOpen);
  const persistEffect = useSutra((s) => s.persistEffect);
  const setPersistOpen = useSutra((s) => s.setPersistOpen);
  const addRule = useSutra((s) => s.addRule);
  const spec = useSutra((s) => s.spec);
  const slug = spec?.slug ?? "project";

  const [pattern, setPattern] = useState("");
  const [scope, setScope] = useState<Exclude<RuleScope, "kiro">>("workspace");

  if (!pending) return null;
  const suggestions = patternSuggestions(pending.command);
  const activePattern = pattern || suggestions[0]!;

  function saveAndContinue() {
    if (!pending) return;
    addRule(
      { capability: "shell", match: [activePattern], effect: persistEffect, scope },
      slug,
    );
    setPersistOpen(false);
    if (persistEffect === "allow") onAllow(pending.command);
    else onDeny(pending.command);
  }

  return (
    <div className="border-b border-border bg-raised px-3 py-3">
      <p className="flex items-center gap-2 text-xs font-medium">
        <ShieldAlert className="size-3.5 text-warn" />
        Sutra wants to run a shell command
      </p>
      {pending.query ? <p className="mt-1 text-xs text-subtle">For: {pending.query}</p> : null}
      <pre className="mt-2 overflow-x-auto rounded-sm bg-bg px-2 py-1.5 font-mono text-[12px] text-fg">
        {pending.command}
      </pre>
      <p className="mt-2 text-[11px] text-subtle">capability: shell · deny overrides allow</p>

      {!persistOpen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onAllow(pending.command)}>
            Allow
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPersistOpen(true, "allow")}>
            Always allow
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDeny(pending.command)}>
            Deny
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPersistOpen(true, "deny")}>
            Always deny
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Pattern</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPattern(p)}
                  className={cn(
                    "h-7 rounded-sm px-2 font-mono text-[11px]",
                    activePattern === p ? "bg-bg text-fg" : "text-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Apply to</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  ["session", "This session"],
                  ["workspace", "This workspace"],
                  ["user", "All workspaces"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setScope(id)}
                  className={cn(
                    "h-7 rounded-sm px-2 text-[11px]",
                    scope === id ? "bg-bg text-fg" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveAndContinue}>
              Save and {persistEffect === "allow" ? "run" : "block"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPersistOpen(false)}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
