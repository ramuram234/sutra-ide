import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { generateModuleSpec } from "@/lib/sutra/generate";
import { PRESETS } from "@/lib/sutra/presets";
import { proposeCommand } from "@/lib/sutra/permissions";
import { stackLabel } from "@/lib/sutra/codegen";
import { loadUser } from "@/lib/sutra/identity";
import { loadPlatform } from "@/lib/sutra/platform-config";
import { useSutra } from "@/lib/sutra/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState<"spec" | "vibe">("spec");
  const chat = chats.find((c) => c.id === activeId);

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
    const res = await generateModuleSpec({
        data: {
          prompt,
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
      if (mode === "vibe") {
        setStage("implement");
        setFile("react");
        addMessage({
          role: "assistant",
          text: `Vibe: generated ${stackLabel(res.spec.stack)} for ${res.spec.name}. Specs are in Explorer if you want to review. Shell still needs Allow / Deny.`,
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
      text: "This chat already has a spec. Open the workspace tabs to approve files, or ask me to run a command (list files, node version). Start a new chat for a different module.",
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 px-3 pt-2">
        {(["spec", "vibe"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "h-7 rounded-sm px-2 text-xs capitalize",
              mode === m ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ol className="grid gap-3">
          {(chat?.messages ?? []).map((m) => (
            <li
              key={m.id}
              className={cn(
                "max-w-[42rem] rounded-md px-3 py-2 text-sm leading-relaxed",
                m.role === "user" && "ml-auto bg-raised",
                m.role === "assistant" && "bg-surface shadow-[var(--shadow-border)]",
                m.role === "system" && "text-xs text-subtle",
              )}
            >
              {m.role !== "system" ? (
                <p className="mb-1 text-[10px] uppercase tracking-wide text-subtle">
                  {m.role === "user" ? "You" : "Sutra"}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </li>
          ))}
        </ol>
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {!spec ? (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDraft(p.prompt)}
              className="h-8 rounded-full bg-raised px-3 text-xs text-muted hover:text-fg"
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={spec ? "Ask to run a command, or start a new chat…" : "What should we build?"}
          className="min-h-20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
        />
        <Button className="mt-2 w-full" disabled={busy || draft.trim().length < 2}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {busy ? "Writing specs…" : spec ? "Send" : "Send and write specs"}
        </Button>
      </form>
    </div>
  );
}
