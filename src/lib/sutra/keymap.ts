import type { ShellOs } from "./schema";

export type IdeAction =
  | "newChat"
  | "closeEditor"
  | "toggleExplorer"
  | "toggleChat"
  | "toggleTerminal"
  | "runTasks"
  | "showShortcuts"
  | "commandPalette"
  | "showKeybindings"
  | "quickOpen"
  | "save"
  | "find";

export type Keybinding = { key: string; command: IdeAction };

export const ACTION_META: {
  id: IdeAction;
  label: string;
  category: "General" | "Edit" | "View" | "AI" | "Run";
}[] = [
  { id: "commandPalette", label: "Command Palette", category: "General" },
  { id: "showKeybindings", label: "Open Keyboard Shortcuts", category: "General" },
  { id: "showShortcuts", label: "Keyboard shortcuts cheatsheet", category: "General" },
  { id: "save", label: "Save", category: "Edit" },
  { id: "find", label: "Find", category: "Edit" },
  { id: "newChat", label: "New chat", category: "AI" },
  { id: "quickOpen", label: "Go to File", category: "General" },
  { id: "closeEditor", label: "Close editor tab", category: "General" },
  { id: "toggleExplorer", label: "Toggle Explorer", category: "View" },
  { id: "toggleChat", label: "Toggle Chat", category: "AI" },
  { id: "toggleTerminal", label: "Toggle Terminal", category: "View" },
  { id: "runTasks", label: "Run tasks / Start", category: "Run" },
];

export const DEFAULT_BINDINGS: Keybinding[] = [
  { key: "ctrl+shift+p", command: "commandPalette" },
  { key: "cmd+shift+p", command: "commandPalette" },
  { key: "alt+p", command: "commandPalette" },
  { key: "ctrl+k ctrl+s", command: "showKeybindings" },
  { key: "alt+k", command: "showKeybindings" },
  { key: "f1", command: "showShortcuts" },
  { key: "ctrl+/", command: "showShortcuts" },
  { key: "cmd+/", command: "showShortcuts" },
  { key: "alt+n", command: "newChat" },
  { key: "alt+w", command: "closeEditor" },
  { key: "ctrl+w", command: "closeEditor" },
  { key: "cmd+w", command: "closeEditor" },
  { key: "ctrl+b", command: "toggleExplorer" },
  { key: "cmd+b", command: "toggleExplorer" },
  { key: "alt+b", command: "toggleExplorer" },
  { key: "alt+c", command: "toggleChat" },
  { key: "ctrl+l", command: "toggleChat" },
  { key: "cmd+l", command: "toggleChat" },
  { key: "ctrl+`", command: "toggleTerminal" },
  { key: "ctrl+j", command: "toggleTerminal" },
  { key: "cmd+j", command: "toggleTerminal" },
  { key: "f5", command: "runTasks" },
  { key: "alt+r", command: "runTasks" },
  { key: "ctrl+p", command: "quickOpen" },
  { key: "cmd+p", command: "quickOpen" },
  { key: "alt+o", command: "quickOpen" },
  { key: "ctrl+s", command: "save" },
  { key: "cmd+s", command: "save" },
  { key: "ctrl+f", command: "find" },
  { key: "cmd+f", command: "find" },
];

const KEY = "sutra.keybindings.v1";
const EDIT_KEYS = new Set(["a", "c", "v", "x", "z", "y"]);

export function loadUserBindings(): Keybinding[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Keybinding[];
    return Array.isArray(raw) ? raw.filter((b) => b.key && b.command) : [];
  } catch {
    return [];
  }
}

export function saveUserBindings(bindings: Keybinding[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(bindings, null, 2));
}

export function keybindingsJson(user: Keybinding[]) {
  return JSON.stringify(user, null, 2);
}

export function eventToKey(e: KeyboardEvent): string | null {
  const raw = e.key;
  if (["Control", "Meta", "Alt", "Shift"].includes(raw)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.metaKey) parts.push("cmd");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  let k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase();
  if (e.code === "Backquote") k = "`";
  if (e.code === "Slash" || k === "/") k = "/";
  parts.push(k);
  return parts.join("+");
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function matchAction(
  e: KeyboardEvent,
  _os: ShellOs,
  extra: Keybinding[] = [],
): IdeAction | null {
  const combo = eventToKey(e);
  if (!combo) return null;
  const typing = isTypingTarget(e.target);
  const key = combo.split("+").pop() ?? "";
  if (typing && EDIT_KEYS.has(key) && (e.ctrlKey || e.metaKey) && !e.altKey) return null;

  const table = [...DEFAULT_BINDINGS, ...extra];
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i]!.key === combo) return table[i]!.command;
  }
  return null;
}

export function shortcutLabel(action: IdeAction, os: ShellOs, extra: Keybinding[] = []): string {
  const table = [...DEFAULT_BINDINGS, ...extra];
  const want = os === "macos" ? "cmd" : "ctrl";
  const hits = table.filter((b) => b.command === action);
  const preferred =
    hits.find((b) => b.key.includes("alt+")) ??
    hits.find((b) => b.key.startsWith(want)) ??
    hits[0];
  if (!preferred) return "";
  return preferred.key
    .replaceAll("ctrl", "Ctrl")
    .replaceAll("cmd", "⌘")
    .replaceAll("alt", "Alt")
    .replaceAll("shift", "Shift")
    .replaceAll("+", "+");
}

export const SHORTCUT_ROWS = ACTION_META.map((a) => ({
  action: a.id,
  label: a.label,
  browser: shortcutLabel(a.id, "windows"),
  desktop: shortcutLabel(a.id, "macos"),
}));
