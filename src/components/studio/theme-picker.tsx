import { useEffect, useState } from "react";
import { loadThemePref, saveThemePref, type ThemePref } from "@/lib/sutra/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemePref; label: string; hint: string }[] = [
  { id: "system", label: "System default", hint: "Follow Windows or macOS appearance" },
  { id: "light", label: "Light", hint: "Light editor and Agent Focus" },
  { id: "dark", label: "Dark", hint: "Kiro-style dark chrome" },
];

export function ThemePicker({ compact }: { compact?: boolean }) {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => setPref(loadThemePref()), []);

  function pick(next: ThemePref) {
    setPref(next);
    saveThemePref(next);
  }

  if (compact) {
    return (
      <select
        aria-label="Color theme"
        className="h-6 rounded-sm bg-raised px-1 text-[11px]"
        value={pref}
        onChange={(e) => pick(e.target.value as ThemePref)}
      >
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => pick(o.id)}
          className={cn(
            "rounded-md px-3 py-3 text-left shadow-[var(--shadow-border)]",
            pref === o.id ? "bg-raised" : "bg-surface hover:bg-raised",
          )}
        >
          <p className="text-sm font-medium">{o.label}</p>
          <p className="mt-1 text-xs text-muted">{o.hint}</p>
        </button>
      ))}
    </div>
  );
}
