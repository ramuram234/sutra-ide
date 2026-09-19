export type AgentMode = "plan" | "manual" | "acceptEdits" | "auto";

export const AGENT_MODES: { id: AgentMode; label: string; hint: string }[] = [
  { id: "plan", label: "Plan", hint: "Read and explore only. No file edits." },
  { id: "manual", label: "Manual", hint: "Ask before edits and shell." },
  { id: "acceptEdits", label: "Accept edits", hint: "Auto-apply file edits. Shell still asks." },
  { id: "auto", label: "Auto", hint: "Edits plus safe commands. Risky shell still asks." },
];

export function nextAgentMode(mode: AgentMode): AgentMode {
  const i = AGENT_MODES.findIndex((m) => m.id === mode);
  return AGENT_MODES[(i + 1) % AGENT_MODES.length]!.id;
}

export function canAutoWrite(mode: AgentMode) {
  return mode === "acceptEdits" || mode === "auto";
}

export function canAutoShell(mode: AgentMode, command: string) {
  if (mode === "plan" || mode === "manual" || mode === "acceptEdits") return false;
  const allow = /^(git status|git log|git diff|git --version|ls|dir|pwd|cat |type |node --version|npm --version)/i;
  return allow.test(command.trim());
}
