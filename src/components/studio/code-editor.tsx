import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function CodeEditor({
  value,
  onChange,
  find = "",
  wrap,
  lineNumbers,
  onCursor,
}: {
  value: string;
  onChange: (v: string) => void;
  find?: string;
  wrap?: boolean;
  lineNumbers?: boolean;
  onCursor?: (line: number, col: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = useMemo(() => value.split("\n"), [value]);
  const [line, setLine] = useState(1);

  function updateCursor() {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = value.slice(0, pos);
    const ln = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    setLine(ln);
    onCursor?.(ln, col);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-bg">
      {lineNumbers ? (
        <div className="w-12 shrink-0 overflow-hidden border-r border-border bg-surface py-3 text-right font-mono text-[11px] leading-5 text-subtle">
          {lines.map((_, i) => (
            <div key={i} className={cn("pr-2", i + 1 === line && "text-fg")}>
              {i + 1}
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        ref={ref}
        spellCheck={false}
        className={cn(
          "min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm leading-5 outline-none",
          wrap ? "whitespace-pre-wrap" : "whitespace-pre overflow-x-auto",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateCursor}
        onKeyUp={updateCursor}
        onClick={updateCursor}
      />
      {find && value.toLowerCase().includes(find.toLowerCase()) ? (
        <p className="sr-only">{find}</p>
      ) : null}
    </div>
  );
}
