import { createServerFn } from "@tanstack/react-start";
import type { AgentMode } from "./agent-modes";
import { listFolder, readWorkspaceFile, writeWorkspaceFile } from "./workspace-io";

export type AgentTool =
  | "read"
  | "write"
  | "edit"
  | "glob"
  | "grep"
  | "bash"
  | "todo"
  | "spawn"
  | "git_status"
  | "git_diff";

export type AgentDef = {
  id: string;
  name: string;
  blurb: string;
  tools: AgentTool[];
  mode?: AgentMode;
  system: string;
  builtin: boolean;
};

const ALL: AgentTool[] = ["read", "write", "edit", "glob", "grep", "bash", "todo", "spawn", "git_status", "git_diff"];
const READ: AgentTool[] = ["read", "glob", "grep", "bash"];

export const TALK_TO = ["team", "default"] as const;

export const BUILTIN_AGENTS: AgentDef[] = [
  {
    id: "team",
    name: "Team",
    blurb: "Lead: discover repo, write todos, spawn workers, edit",
    tools: ALL,
    mode: "acceptEdits",
    system:
      "You are the team lead. You have no catalog of product tasks. For every user request: glob/grep/read the real repo, write your own todos, spawn workers only for large slices, then edit existing code. Never scaffold a second app alongside the stack you found.",
    builtin: true,
  },
  {
    id: "default",
    name: "Default",
    blurb: "Solo coding assistant",
    tools: ALL,
    system: "You are Sutra Default. Gather context, edit, run, verify. Be concise.",
    builtin: true,
  },
  {
    id: "spec",
    name: "Spec",
    blurb: "Requirements → design → tasks with gates",
    tools: ALL,
    system: "You are Sutra Spec. Produce EARS requirements, design, then tasks. Ask before implementing.",
    builtin: true,
  },
  {
    id: "plan",
    name: "Plan",
    blurb: "Read-only research and a written plan",
    tools: READ,
    mode: "plan",
    system: "You are Sutra Plan. Read-only. Explore, then output a numbered plan. Do not edit source.",
    builtin: true,
  },
  {
    id: "bugfix",
    name: "Bug Fix",
    blurb: "Root cause, fix, prevent regression",
    tools: ALL,
    system: "You are Sutra Bug Fix. Reproduce, find root cause, patch, add a regression check.",
    builtin: true,
  },
  {
    id: "quickspec",
    name: "Quick Spec",
    blurb: "Spec then implement without waiting",
    tools: ALL,
    mode: "acceptEdits",
    system: "You are Sutra Quick Spec. Write a short spec then implement immediately.",
    builtin: true,
  },
  {
    id: "explore",
    name: "Explore",
    blurb: "Map the codebase. No edits.",
    tools: READ,
    mode: "plan",
    system: "You are Sutra Explore. Map architecture, key files, and risks. Do not edit.",
    builtin: true,
  },
  {
    id: "review",
    name: "Review",
    blurb: "Code review: bugs, security, tests",
    tools: READ,
    mode: "plan",
    system: "You are Sutra Review. Find bugs, security issues, missing tests. Suggest diffs; do not apply them.",
    builtin: true,
  },
  {
    id: "docs",
    name: "Docs",
    blurb: "Write README / comments only",
    tools: ["read", "write", "edit", "glob", "grep"],
    system: "You are Sutra Docs. Only create or edit markdown and comments. Do not change runtime logic.",
    builtin: true,
  },
];

export function parseAgentMarkdown(id: string, text: string): AgentDef {
  let body = text;
  const meta: Record<string, string> = {};
  if (text.startsWith("---")) {
    const end = text.indexOf("---", 3);
    if (end > 0) {
      for (const line of text.slice(3, end).split("\n")) {
        const i = line.indexOf(":");
        if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      }
      body = text.slice(end + 3).trim();
    }
  }
  const tools = (meta.tools ?? "read,grep,glob")
    .split(",")
    .map((t) => t.trim() as AgentTool)
    .filter((t) => ALL.includes(t));
  const mode = meta.mode as AgentMode | undefined;
  return {
    id,
    name: meta.name || id,
    blurb: meta.blurb || body.slice(0, 80),
    tools: tools.length ? tools : READ,
    mode: mode === "plan" || mode === "manual" || mode === "acceptEdits" || mode === "auto" ? mode : undefined,
    system: body || `You are custom agent ${id}.`,
    builtin: false,
  };
}

export function findAgent(id: string, extra: AgentDef[] = []) {
  return extra.find((a) => a.id === id) ?? BUILTIN_AGENTS.find((a) => a.id === id) ?? BUILTIN_AGENTS[0]!;
}

export const loadProjectAgents = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }): Promise<AgentDef[]> => {
    const listed = await listFolder({ data: { folder: data.folder } });
    const files = listed.entries.filter((e) => /\.sutra\/agents\/.+\.md$/i.test(e.path) && !e.dir);
    const extra: AgentDef[] = [];
    for (const f of files) {
      try {
        const raw = await readWorkspaceFile({ data: { folder: data.folder, rel: f.path } });
        extra.push(parseAgentMarkdown(f.name.replace(/\.md$/i, ""), raw.content));
      } catch {
        /* skip */
      }
    }
    return extra;
  });

export const seedReviewAgent = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    await writeWorkspaceFile({
      data: {
        folder: data.folder,
        rel: ".sutra/agents/review.md",
        content: `---
name: Review
blurb: Custom reviewer — copy this file to add more agents
tools: read,grep,glob
mode: plan
---
You are a strict code reviewer. Never edit files. List findings as severity + file + fix.
`,
      },
    });
    return { ok: true as const };
  });
