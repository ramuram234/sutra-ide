import { useEffect, useRef } from "react";
import { matchAction, type IdeAction, type Keybinding } from "@/lib/sutra/keymap";
import type { ShellOs } from "@/lib/sutra/schema";

export function useIdeShortcuts(
  os: ShellOs,
  handlers: Partial<Record<IdeAction, () => void>>,
  extra: Keybinding[] = [],
) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const extraRef = useRef(extra);
  extraRef.current = extra;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = matchAction(e, os, extraRef.current);
      if (!action) return;
      const fn = ref.current[action];
      if (!fn) return;
      e.preventDefault();
      e.stopPropagation();
      fn();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [os]);
}
