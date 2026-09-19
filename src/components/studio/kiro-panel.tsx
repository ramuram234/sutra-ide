import type { ReactNode } from "react";
import { BUILTIN_AGENTS, TALK_TO } from "@/lib/sutra/agents";
import { loadPlatform } from "@/lib/sutra/platform-config";
import { useSutra } from "@/lib/sutra/store";

export function KiroPanel({
  specName,
  onOpenSpec,
}: {
  specName?: string;
  onOpenSpec: () => void;
}) {
  const mcp = loadPlatform().mcp;
  const agentId = useSutra((s) => s.agentId);
  const setAgentId = useSutra((s) => s.setAgentId);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3">
      <p className="px-1 py-2 text-[11px] font-medium tracking-widest text-subtle">KIRO</p>
      <Section title="TALK TO">
        {BUILTIN_AGENTS.filter((a) => (TALK_TO as readonly string[]).includes(a.id)).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAgentId(a.id)}
            className={`block w-full truncate px-2 py-1 text-left text-xs hover:bg-raised ${agentId === a.id ? "bg-raised text-fg" : "text-muted"}`}
          >
            {a.name}
            <span className="block text-[10px] text-subtle">{a.blurb}</span>
          </button>
        ))}
      </Section>
      <Section title="WORKERS (auto)">
        {BUILTIN_AGENTS.filter((a) => !(TALK_TO as readonly string[]).includes(a.id)).map((a) => (
          <p key={a.id} className="px-2 py-0.5 text-[11px] text-subtle">
            {a.name}
          </p>
        ))}
        <p className="px-2 pt-1 text-[10px] text-subtle">You do not chat with workers. Team assigns them.</p>
      </Section>
      <Section title="SPECS">
        {specName ? (
          <button type="button" className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-raised" onClick={onOpenSpec}>
            {specName}
          </button>
        ) : (
          <p className="px-2 text-xs text-subtle">No spec yet. Start Spec in Agent Focus.</p>
        )}
      </Section>
      <Section title="AGENT STEERING">
        <p className="px-2 text-xs text-subtle">Add SUTRA.md / AGENTS.md in the folder. Loaded every agent turn.</p>
      </Section>
      <Section title="AGENT HOOKS">
        <p className="px-2 text-xs text-subtle">Allow / Deny is the hook gate. Protected paths never auto-write.</p>
      </Section>
      <Section title="MCP SERVERS">
        {mcp.map((s) => (
          <p key={s.id} className="px-2 py-0.5 text-xs">
            {s.enabled ? "●" : "○"} {s.name}
          </p>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <p className="px-1 text-[11px] tracking-widest text-subtle">{title}</p>
      {children}
    </div>
  );
}
