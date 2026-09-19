import { useState } from "react";
import { ArrowUp, Bug, FileText, ListTodo, Loader2, Zap } from "lucide-react";
import { generateModuleSpec } from "@/lib/sutra/generate";
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

export function ChatThread() {
  const chats = useSutra((s) => s.chats);
  const activeId = useSutra((s) => s.activeId);
  const spec = useSutra((s) => s.spec);
  const os = useSutra((s) => s.os);
  const busy = useSutra((s) => s.busy);
  const error = useSutra((s) => s.error);
  const addMessage = useSutra((s) => s.addMessage);
  const setBusy = useSutra((s) => s.setBusy);
  const setError = useSutra((s) => s.setError);
  const setSpec = useSutra((s) => s.setSpec);
  const setPending = useSutra((s) => s.setPending);
  const setStage = useSutra((s) => s.setStage);
  const setFile = useSutra((s) => s.setFile);
  const [draft, setDraft] = useState("");
  const [workflow, setWorkflow] = useState<AgentWorkflow>("spec");
  const [autopilot, setAutopilot] = useState(false);
  const chat = chats.find((c) => c.id === activeId);
  const models = loadPlatform().models.filter((m) => m.enabled);
  const empty = (chat?.messages ?? []).filter((m) => m.role !== "system").length === 0 && !spec;

  async function send(text: string) {
    const prompt = text.trim();
    if (prompt.length < 2 || busy) return;
    setDraft("");
    addMessage({ role: "user", text: prompt });
    setError(null);

    if (!spec) {
      const platform = loadPlatform();
      if (platform.keycloak.enabled && !loadUser()) {
        addMessage({
          role: "assistant",
          text: "Keycloak is required. Open Settings → Identity and sign in, then send again.",
        });
        return;
      }
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
          text: `Quick Spec (${stackLabel(res.spec.stack)}) for ${res.spec.name}. Specs are in Explorer. Shell still needs Allow / Deny unless Autopilot allowed the command.`,
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
                        onClick={() => setWorkflow(w.id)}
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
            placeholder="Ask a question or describe a task…"
            className="min-h-16 border-0 bg-transparent shadow-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
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
