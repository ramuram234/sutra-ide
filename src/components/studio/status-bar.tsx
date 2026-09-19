import { Bell, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar({
  os,
  branch,
  errors,
  warnings,
  line,
  col,
  language,
  notice,
  onProblems,
  onScm,
}: {
  os: string;
  branch?: string;
  errors: number;
  warnings: number;
  line: number;
  col: number;
  language: string;
  notice?: string | null;
  onProblems: () => void;
  onScm: () => void;
}) {
  return (
    <footer className="flex h-6 items-center gap-3 overflow-x-auto border-t border-border bg-[var(--color-activity)] px-2 font-mono text-[11px] text-subtle">
      <button type="button" className="flex items-center gap-1 hover:text-fg" onClick={onScm}>
        <GitBranch className="size-3" />
        {branch || "main"}
      </button>
      <button type="button" className={cn("hover:text-fg", errors ? "text-danger" : "")} onClick={onProblems}>
        {errors} errors · {warnings} warnings
      </button>
      <span>{os}</span>
      {notice ? <span className="text-ok truncate">{notice}</span> : null}
      <span className="flex-1" />
      <span>
        Ln {line}, Col {col}
      </span>
      <span>Spaces: 2</span>
      <span>UTF-8</span>
      <span>{language}</span>
      <Bell className="size-3" />
    </footer>
  );
}
