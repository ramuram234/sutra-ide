import { useEffect, useState } from "react";
import { ArrowUp, Bug, FileText, ListTodo, Loader2, Zap } from "lucide-react";
import { BUILTIN_AGENTS, findAgent, loadProjectAgents, seedReviewAgent, type AgentDef } from "@/lib/sutra/agents";
import { generateModuleSpec } from "@/lib/sutra/generate";
import { runAgent, type AgentPending, type AgentTrace } from "@/lib/sutra/agent-loop";
import { AGENT_MODES, nextAgentMode, type AgentMode } from "@/lib/sutra/agent-modes";
import { initSutraMd, listSkills, rewindFile } from "@/lib/sutra/claude-memory";
import { parseSlash, SLASH } from "@/lib/sutra/slash";
import { PRESETS } from "@/lib/sutra/presets";
import { proposeCommand } from "@/lib/sutra/permissions";
import { stackLabel } from "@/lib/sutra/codegen";
import { loadUser } from "@/lib/sutra/identity";
import { loadPlatform } from "@/lib/sutra/platform-config";
import { useSutra } from "@/lib/sutra/store";
import { SutraMark } from "@/components/studio/sutra-mark";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AgentWorkflow = "spec" | "plan" | "bugfix" | "quickspec";

const WORKFLOWS: { id: AgentWorkflow; title: string; blurb: string; icon: typeof FileText }[] = [
  { id: "spec", title: "Spec", blurb: "Structured feature development", icon: FileText },
  { id: "plan", title: "Plan", blurb: "Plan-only: break ideas down, no code yet", icon: ListTodo },
  { id: "bugfix", title: "Bug Fix", blurb: "Investigate, diagnose, prevent regression", icon: Bug },
  { id: "quickspec", title: "Quick Spec", blurb: "Clarify, then auto-generate", icon: Zap },
];

export function ChatThread({ folder }: { folder?: string | null }) {
  const chats = useSutra((s) => s.chats);
  const activeId = useSutra((s) => s.activeId);
  const spec = useSutra((s) => s.spec);
  const os = useSutra((s) => s.os);
  const busy = useSutra((s) => s.busy);
  const error = useSutra((s) => s.error);
  const addMessage = useSutra((s) => s.addMessage);
  const newChatTab = useSutra((s) => s.newChatTab);
  const setBusy = useSutra((s) => s.setBusy);
  const setError = useSutra((s) => s.setError);
  const setSpec = useSutra((s) => s.setSpec);
  const setPending = useSutra((s) => s.setPending);
  const setStage = useSutra((s) => s.setStage);
  const setFile = useSutra((s) => s.setFile);
  const agentId = useSutra((s) => s.agentId);
  const setAgentId = useSutra((s) => s.setAgentId);
  const [draft, setDraft] = useState("");
  const [workflow, setWorkflow] = useState<AgentWorkflow>("spec");
  const [autopilot, setAutopilot] = useState(false);
  const [mode, setMode] = useState<AgentMode>("manual");
  const [pendingTool, setPendingTool] = useState<{ prompt: string; pending: AgentPending } | null>(null);
  const [customAgents, setCustomAgents] = useState<AgentDef[]>([]);
  const chat = chats.find((c) => c.id === activeId);
  const models = loadPlatform().models.filter((m) => m.enabled);
  const agents = [...BUILTIN_AGENTS, ...customAgents];
  const activeAgent = findAgent(agentId, customAgents);
  const empty = (chat?.messages ?? []).filter((m) => m.role !== "system").length === 0 && !spec;

  useEffect(() => {
    if (!folder) return;
    void loadProjectAgents({ data: { folder } }).then(setCustomAgents);
  }, [folder]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Tab" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) {
          e.preventDefault();
          setMode((m) => nextAgentMode(m));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function agent(prompt: string, approved?: AgentPending) {
    if (!folder) return;
    setBusy(true);
    const res = await runAgent({
      data: {
        folder,
        prompt:
          workflow === "plan" || mode === "plan" ? `Plan only. Do not edit files. ${prompt}` : prompt,
        mode: autopilot ? "acceptEdits" : activeAgent.mode ?? (workflow === "plan" ? "plan" : mode),
        modelId: loadPlatform().defaultModelId,
        agentId,
        approved,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      addMessage({ role: "assistant", text: res.error });
      return;
    }
    if (res.trace.length) {
      addMessage({
        role: "assistant",
        text: res.trace.map((t: AgentTrace) => `${t.ok ? "✓" : "✗"} ${t.name}: ${t.detail.slice(0, 180)}`).join("\n"),
      });
    }
    if (res.pending) {
      setPendingTool({ prompt, pending: res.pending });
      addMessage({
        role: "assistant",
        text: `Allow ${res.pending.name} ${res.pending.args.path || res.pending.args.command || ""}?`,
      });
      return;
    }
    addMessage({ role: "assistant", text: res.text });
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (prompt.length < 2 || busy) return;
    setDraft("");
    addMessage({ role: "user", text: prompt });
    setError(null);

    const slash = parseSlash(prompt);
    if (slash) {
      if (slash.cmd === "help") {
        addMessage({
          role: "assistant",
          text: `Claude Code-style slash commands\n${SLASH.map((s) => `${s.cmd}  — ${s.hint}`).join("\n")}\n\nShift+Tab cycles Plan / Manual / Accept edits / Auto.`,
        });
        return;
      }
      if (slash.cmd === "clear") {
        newChatTab();
        return;
      }
      if (slash.cmd === "plan") {
        setMode("plan");
        addMessage({ role: "assistant", text: "Plan mode on. I will only read and propose — no file edits until you switch mode." });
        return;
      }
      if (slash.cmd === "compact") {
        addMessage({ role: "assistant", text: "Context compacted. Ask me to continue; I will not replay old tool traces." });
        return;
      }
      if (slash.cmd === "model") {
        addMessage({ role: "assistant", text: `Active model: ${loadPlatform().defaultModelId}` });
        return;
      }
      if (slash.cmd === "init") {
        if (!folder) {
          addMessage({ role: "assistant", text: "Open a folder first, then /init." });
          return;
        }
        const r = await initSutraMd({ data: { folder } });
        await seedReviewAgent({ data: { folder } });
        const extra = await loadProjectAgents({ data: { folder } });
        setCustomAgents(extra);
        addMessage({
          role: "assistant",
          text: `Wrote ${r.path} and .sutra/agents/review.md. Switch with /agent review`,
        });
        return;
      }
      if (slash.cmd === "doctor") {
        const skills = folder ? await listSkills({ data: { folder } }) : [];
        addMessage({
          role: "assistant",
          text: `Folder: ${folder || "(none)"}\nAgent: ${activeAgent.name}\nModel: ${loadPlatform().defaultModelId}\nMode: ${mode}\nSkills: ${skills.length ? skills.join(", ") : "none"}`,
        });
        return;
      }
      if (slash.cmd === "agent") {
        const id = (slash.arg || "default").toLowerCase();
        const hit = agents.find((a) => a.id === id || a.name.toLowerCase() === id);
        if (!hit) {
          addMessage({
            role: "assistant",
            text: `Unknown agent. Try: ${agents.map((a) => a.id).join(", ")}`,
          });
          return;
        }
        setAgentId(hit.id);
        if (hit.mode) setMode(hit.mode);
        addMessage({ role: "assistant", text: `Switched to ${hit.name}. ${hit.blurb}` });
        return;
      }
      if (slash.cmd === "rewind") {
        if (!folder || !slash.arg) {
          addMessage({ role: "assistant", text: "Usage: /rewind path/to/file.ts" });
          return;
        }
        try {
          const r = await rewindFile({ data: { folder, rel: slash.arg } });
          addMessage({ role: "assistant", text: `Restored ${r.restored} from checkpoint.` });
        } catch {
          addMessage({ role: "assistant", text: "No checkpoint for that file yet." });
        }
        return;
      }
    }

    if (folder) {
      await agent(prompt);
      return;
    }

    if (!spec) {
      setBusy(true);
      const prefixed =
        workflow === "bugfix"
          ? `Bugfix spec. Investigate root cause and add regression prevention. ${prompt}`
          : workflow === "plan"
            ? `Plan only. Requirements and design, no implementation tasks that write code. ${prompt}`
            : prompt;
      const res = await generateModuleSpec({
        data: {
          prompt: prefixed,
          modelId: loadPlatform().defaultModelId,
          userId: loadUser()?.sub,
        },
      });
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        addMessage({ role: "assistant", text: res.error });
        return;
      }
      setSpec(res.spec);
      if (workflow === "quickspec" || autopilot) {
        setStage("implement");
        setFile("react");
        addMessage({
          role: "assistant",
          text: `Quick Spec (${stackLabel(res.spec.stack)}) for ${res.spec.name}. Specs are in Explorer. Shell still needs Allow / Deny — Autopilot never skips command approval.`,
        });
      } else if (workflow === "plan") {
        addMessage({
          role: "assistant",
          text: `Plan for ${res.spec.name}. Review requirements.md and design.md. Plan mode does not write code until you switch to Spec and run tasks.`,
        });
      } else {
        addMessage({
          role: "assistant",
          text: `Spec (${stackLabel(res.spec.stack)}) for ${res.spec.name}. Approve requirements.md, then design and tasks.`,
        });
      }
      return;
    }

    const cmd = proposeCommand(prompt, os);
    if (cmd) {
      addMessage({
        role: "assistant",
        text: `I want to run \`${cmd}\`. Approve it in the workspace terminal: Allow, Always allow this workspace, or Deny.`,
      });
      setPending({ command: cmd, query: prompt });
      return;
    }

    addMessage({
      role: "assistant",
      text: "This chat already has a spec. Open the workspace tabs to approve files, or ask me to run a command. Start a new session for a different module.",
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex flex-col items-center px-5 pt-10 pb-4">
            <SutraMark className="mb-3 size-16 text-fg" />
            <p className="font-display text-3xl tracking-tight text-accent">Let's build</p>
            <p className="mt-1 text-sm text-muted">Plan, search, or build anything</p>
            <div className="mt-8 w-full">
              <p className="mb-3 text-xs text-subtle">Start with a workflow (optional)</p>
              <ul className="grid gap-1">
                {WORKFLOWS.map((w) => {
                  const Icon = w.icon;
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkflow(w.id);
                          setAgentId(w.id);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left",
                          workflow === w.id ? "bg-raised" : "hover:bg-surface",
                        )}
                      >
                        <Icon className="mt-0.5 size-4 text-accent" />
                        <span>
                          <span className="block text-sm text-fg">{w.title}</span>
                          <span className="block text-xs text-subtle">{w.blurb}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-6 flex w-full flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDraft(p.prompt)}
                  className="h-7 rounded-sm px-2 text-xs text-muted hover:bg-raised hover:text-fg"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="grid gap-3 p-4">
            {(chat?.messages ?? [])
              .filter((m) => m.role !== "system")
              .map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[42rem] rounded-md px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" && "ml-auto bg-raised",
                    m.role === "assistant" && "bg-surface shadow-[var(--shadow-border)]",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </li>
              ))}
            {error ? (
              <li className="text-sm text-danger" role="alert">
                {error}
              </li>
            ) : null}
            {pendingTool ? (
              <li className="flex gap-2">
                <button
                  type="button"
                  className="h-8 rounded-sm bg-accent px-3 text-xs text-accent-fg"
                  onClick={() => {
                    const p = pendingTool;
                    setPendingTool(null);
                    void agent(p.prompt, p.pending);
                  }}
                >
                  Allow
                </button>
                <button
                  type="button"
                  className="h-8 rounded-sm bg-raised px-3 text-xs"
                  onClick={() => {
                    setPendingTool(null);
                    addMessage({ role: "assistant", text: "Denied." });
                  }}
                >
                  Deny
                </button>
              </li>
            ) : null}
          </ol>
        )}
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div className="rounded-md bg-raised p-2 shadow-[var(--shadow-border)]">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={folder ? "Ask Sutra Code…  /help  /init  #file" : "Ask a question or describe a task…"}
            className="min-h-16 border-0 bg-transparent shadow-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
            <select
              className="h-7 max-w-[8rem] rounded-sm bg-surface px-2"
              value={agentId}
              onChange={(e) => {
                const id = e.target.value;
                setAgentId(id);
                const a = findAgent(id, customAgents);
                if (a.mode) setMode(a.mode);
              }}
              title="Agent"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="h-7 rounded-sm bg-surface px-2"
              value={mode}
              onChange={(e) => setMode(e.target.value as AgentMode)}
              title="Shift+Tab cycles modes"
            >
              {AGENT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <select className="h-7 rounded-sm bg-surface px-2" defaultValue={loadPlatform().defaultModelId}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <span>High</span>
            <span className="flex-1" />
            <label className="flex items-center gap-1">
              Autopilot
              <input type="checkbox" checked={autopilot} onChange={(e) => setAutopilot(e.target.checked)} />
            </label>
            <button
              type="submit"
              disabled={busy || draft.trim().length < 2}
              className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-40"
              aria-label="Send"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
