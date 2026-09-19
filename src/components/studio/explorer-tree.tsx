import { useMemo, useState } from "react";
import { ChevronRight, File, Folder } from "lucide-react";
import type { DirEntry } from "@/lib/sutra/workspace-io";
import { cn } from "@/lib/utils";

export function ExplorerTree({
  entries,
  active,
  onOpen,
}: {
  entries: DirEntry[];
  active?: string | null;
  onOpen: (rel: string) => void;
}) {
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({ "": true });
  const tree = useMemo(() => {
    const files = entries.filter((e) => !e.dir).sort((a, b) => a.path.localeCompare(b.path));
    return files;
  }, [entries]);

  const dirs = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const parts = e.path.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - (e.dir ? 0 : 1); i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i]!;
        set.add(acc);
      }
    }
    return [...set].sort();
  }, [entries]);

  return (
    <div className="text-xs">
      {dirs.map((d) => {
        const depth = d.split("/").length;
        const parent = d.split("/").slice(0, -1).join("/");
        if (parent && openDirs[parent] === false) return null;
        const expanded = openDirs[d] !== false;
        return (
          <button
            key={d}
            type="button"
            style={{ paddingLeft: 8 + depth * 8 }}
            className="flex h-6 w-full items-center gap-1 text-left text-muted hover:bg-raised"
            onClick={() => setOpenDirs((s) => ({ ...s, [d]: s[d] === false }))}
          >
            <ChevronRight className={cn("size-3 transition", expanded && "rotate-90")} />
            <Folder className="size-3" />
            {d.split("/").pop()}
          </button>
        );
      })}
      {tree.map((e) => {
        const parent = e.path.includes("/") ? e.path.slice(0, e.path.lastIndexOf("/")) : "";
        if (parent && openDirs[parent] === false) return null;
        const depth = e.path.split("/").length;
        return (
          <button
            key={e.path}
            type="button"
            style={{ paddingLeft: 20 + depth * 8 }}
            className={cn(
              "flex h-6 w-full items-center gap-1 truncate text-left hover:bg-raised",
              active === e.path && "bg-raised text-fg",
            )}
            onClick={() => onOpen(e.path)}
          >
            <File className="size-3 shrink-0 text-subtle" />
            {e.name}
          </button>
        );
      })}
    </div>
  );
}
