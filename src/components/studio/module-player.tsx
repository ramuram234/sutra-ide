import { useMemo, useState, type FormEvent } from "react";
import type { FieldSpec, ModuleSpec, ScreenSpec } from "@/lib/sutra/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Row = Record<string, string | boolean> & { id: string; status: string };

function emptyRow(fields: FieldSpec[]): Omit<Row, "id" | "status"> {
  const o: Record<string, string | boolean> = {};
  for (const f of fields) o[f.name] = f.type === "checkbox" ? false : "";
  return o;
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "select") {
    return (
      <select
        className="flex h-10 w-full rounded-sm bg-bg px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-accent"
        />
        {field.label}
      </label>
    );
  }
  return (
    <Input
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FormScreen({
  screen,
  onCreate,
}: {
  screen: ScreenSpec;
  onCreate: (row: Omit<Row, "id" | "status">) => void;
}) {
  const [draft, setDraft] = useState(() => emptyRow(screen.fields));
  const [msg, setMsg] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    for (const f of screen.fields) {
      if (f.required && f.type !== "checkbox" && !String(draft[f.name] ?? "").trim()) {
        setMsg(`Fill ${f.label}`);
        return;
      }
    }
    onCreate(draft);
    setDraft(emptyRow(screen.fields));
    setMsg("Submitted to in-memory store. API is mocked in this preview.");
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-sm text-muted">{screen.description}</p>
      {screen.fields.map((f) => (
        <label key={f.name} className="grid gap-1.5">
          {f.type !== "checkbox" ? (
            <span className="text-xs font-medium text-muted">
              {f.label}
              {f.required ? " *" : ""}
            </span>
          ) : null}
          <FieldControl
            field={f}
            value={draft[f.name] ?? (f.type === "checkbox" ? false : "")}
            onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))}
          />
          {f.help ? <span className="text-xs text-subtle">{f.help}</span> : null}
        </label>
      ))}
      <Button type="submit">Submit</Button>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </form>
  );
}

function ListScreen({
  screen,
  rows,
  onOpen,
}: {
  screen: ScreenSpec;
  rows: Row[];
  onOpen: (id: string) => void;
}) {
  const cols = (screen.fields.length ? screen.fields : [{ name: "id", label: "Id", type: "text" as const, required: false }]).slice(0, 4);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">{screen.description}</p>
      {rows.length === 0 ? (
        <p className="rounded-md bg-bg px-3 py-8 text-center text-sm text-subtle">
          No records yet. Submit the form screen first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-subtle">
              <tr>
                {cols.map((c) => (
                  <th key={c.name} className="px-2 py-2 font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  {cols.map((c) => (
                    <td key={c.name} className="px-2 py-2">
                      {String(r[c.name] ?? "—")}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(r.id)}>
                      <Badge tone="warn">{r.status}</Badge>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ModulePlayer({ spec }: { spec: ModuleSpec }) {
  const screens = spec.screens;
  const [active, setActive] = useState(screens[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const screen = screens.find((s) => s.id === active) ?? screens[0];

  const postApi = useMemo(
    () => spec.apis.find((a) => a.method === "POST"),
    [spec.apis],
  );

  if (!screen) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-display text-lg leading-tight">{spec.name}</p>
          <p className="text-xs text-muted">Live preview · in-memory store</p>
        </div>
        <Badge tone="accent">{spec.module}</Badge>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
        {screens.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={cn(
              "h-8 shrink-0 rounded-sm px-3 text-xs",
              s.id === screen.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {screen.type === "form" ? (
          <FormScreen
            screen={screen}
            onCreate={(data) => {
              const id = crypto.randomUUID().slice(0, 8);
              setRows((r) => [{ ...data, id, status: "Pending" }, ...r]);
              setLog((l) => [
                `${postApi?.method ?? "POST"} ${postApi?.path ?? "/api"} · ${id}`,
                ...l,
              ]);
            }}
          />
        ) : screen.type === "list" ? (
          <ListScreen
            screen={screen}
            rows={rows}
            onOpen={(id) => {
              const detail = screens.find((s) => s.type === "detail");
              if (detail) setActive(detail.id);
              setLog((l) => [`GET record ${id}`, ...l]);
            }}
          />
        ) : (
          <div className="grid gap-2 text-sm">
            <p className="text-muted">{screen.description}</p>
            {rows[0] ? (
              Object.entries(rows[0]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border py-2">
                  <span className="text-subtle">{k}</span>
                  <span>{String(v)}</span>
                </div>
              ))
            ) : (
              <p className="text-subtle">Submit a form row to inspect it here.</p>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-border bg-bg px-4 py-2 font-mono text-[11px] text-subtle">
        {log[0] ?? "API log — actions in this preview call generated routes"}
      </div>
    </div>
  );
}
