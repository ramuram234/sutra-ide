export const SLASH = [
  { cmd: "/init", hint: "Scan the folder and write SUTRA.md (Claude Code CLAUDE.md)" },
  { cmd: "/plan", hint: "Switch to Plan mode — read only, no edits" },
  { cmd: "/compact", hint: "Drop old tool traces, keep the last answers" },
  { cmd: "/clear", hint: "Start a new session" },
  { cmd: "/help", hint: "List slash commands, skills, and modes" },
  { cmd: "/model", hint: "Show the active model" },
  { cmd: "/doctor", hint: "Check folder, SUTRA.md, and model key" },
  { cmd: "/rewind", hint: "Restore last file checkpoint" },
  { cmd: "/agent", hint: "Switch agent: /agent review | explore | spec | default" },
];

export function parseSlash(text: string) {
  const t = text.trim();
  if (!t.startsWith("/")) return null;
  const [raw, ...rest] = t.slice(1).split(/\s+/);
  return { cmd: (raw ?? "").toLowerCase(), arg: rest.join(" ") };
}
