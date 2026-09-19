export type ThemePref = "system" | "light" | "dark";

const KEY = "sutra.theme";

export function loadThemePref(): ThemePref {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function resolvedTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  const mode = resolvedTheme(pref);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#1a1a22" : "#f3f3f6");
  const desktop = (window as Window & { sutraDesktop?: { setNativeTheme?: (s: string) => void } }).sutraDesktop;
  desktop?.setNativeTheme?.(pref);
}

export function saveThemePref(pref: ThemePref) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("sutra.theme")||"system";var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var m=d?"dark":"light";document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m;}catch(e){}})();`;
