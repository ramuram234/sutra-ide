import { useEffect } from "react";
import { applyTheme, loadThemePref } from "@/lib/sutra/theme";

export function ThemeRoot() {
  useEffect(() => {
    applyTheme(loadThemePref());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (loadThemePref() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
