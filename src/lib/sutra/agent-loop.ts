import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { canAutoShell, canAutoWrite, type AgentMode } from "./agent-modes";
import { findAgent, loadProjectAgents, type AgentTool } from "./agents";
import { DEFAULT_PLATFORM } from "./platform-config";
import { chatWithTools, type ToolDef } from "./model-router";
import { evaluate } from "./permissions";
import {
  execInFolder,
  listFolder,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "./workspace-io";

const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read",
      description: "Read a file in the workspace.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write",
      description: "Create or overwrite a file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit",
      description: "Replace an exact string in a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "glob",
      description: "List files matching a substring.",
      parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description: "Search file contents.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "bash",
      description: "Run a workspace shell command (allowlisted).",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "todo",
      description: "Replace the current task list with items you invented for THIS request. The host has no product catalog.",
      parameters: {
        type: "object",
        properties: { items: { type: "string", description: "Markdown checklist" } },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn",
      description: "Run a worker in a separate context on one goal. Worker cannot spawn further.",
      parameters: {
        type: "object",
        properties: { goal: { type: "string" } },
        required: ["goal"],
      },
    },
  },
];

export type AgentTrace = { name: string; ok: boolean; detail: string };
export type AgentPending = { name: string; args: Record<string, string> };

function parseArgs(raw: string): Record<string, string> {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
  } catch {
    return {};
  }
}

function parseFallback(text: string): { tool?: string; args?: Record<string, string>; final?: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as { tool?: string; args?: Record<string, string>; final?: string };
  } catch {
    return null;
  }
}

async function memory(folder: string) {
  const names = ["SUTRA.md", "AGENTS.md", "CLAUDE.md"];
  const bits: string[] = [];
  for (const name of names) {
    try {
      bits.push(`# ${name}\n${(await readFile(path.join(folder, name), "utf8")).slice(0, 6000)}`);
    } catch {
      /* missing is fine */
    }
  }
  return bits.join("\n\n");
}

async function execTool(
  folder: string,
  mode: AgentMode,
  name: string,
  args: Record<string, string>,
  approved: boolean,
  allowed: AgentTool[],
  depth = 0,
): Promise<{ ok: boolean; detail: string; pending?: AgentPending }> {
  if (!allowed.includes(name as AgentTool)) {
    return { ok: false, detail: `Agent is not allowed to use ${name}.` };
  }
  const rel = (args.path || args.pattern || "").replaceAll("\\", "/");
  if (name === "read") {
    const f = await readWorkspaceFile({ data: { folder, rel } });
    return { ok: true, detail: f.content.slice(0, 12_000) };
  }
  if (name === "glob") {
    const listed = await listFolder({ data: { folder } });
    const hits = listed.entries.filter((e) => e.path.toLowerCase().includes((args.pattern || "").toLowerCase()));
    return { ok: true, detail: hits.slice(0, 80).map((e) => e.path).join("\n") || "(none)" };
  }
  if (name === "grep") {
    const listed = await listFolder({ data: { folder } });
    const q = (args.query || "").toLowerCase();
    const hits: string[] = [];
    for (const e of listed.entries.filter((x) => !x.dir).slice(0, 60)) {
      try {
        const f = await readWorkspaceFile({ data: { folder, rel: e.path } });
        if (f.content.toLowerCase().includes(q)) hits.push(e.path);
      } catch {
        /* skip */
      }
    }
    return { ok: true, detail: hits.join("\n") || "(none)" };
  }
  if (name === "write" || name === "edit") {
    if (mode === "plan") return { ok: false, detail: "Plan mode cannot edit files. Switch to Manual / Accept edits / Auto." };
    if (!canAutoWrite(mode) && !approved) return { ok: true, detail: "", pending: { name, args } };
    try {
      const cur = await readWorkspaceFile({ data: { folder, rel } });
      await writeWorkspaceFile({
        data: { folder, rel: `.sutra/checkpoints/${rel.replaceAll("/", "__")}.bak`, content: cur.content },
      });
    } catch {
      /* new file */
    }
    if (name === "write") {
      await writeWorkspaceFile({ data: { folder, rel, content: args.content || "" } });
      return { ok: true, detail: `Wrote ${rel}` };
    }
    const cur = await readWorkspaceFile({ data: { folder, rel } });
    if (!cur.content.includes(args.old_string || "")) return { ok: false, detail: "old_string not found" };
    await writeWorkspaceFile({
      data: { folder, rel, content: cur.content.replace(args.old_string || "", args.new_string || "") },
    });
    return { ok: true, detail: `Edited ${rel}` };
  }
  if (name === "bash") {
    const command = args.command || "";
    if (mode === "plan" && !/^(ls|dir|pwd|git status|git log|git diff|cat |type )/i.test(command)) {
      return { ok: false, detail: "Plan mode only allows read-only inspection commands." };
    }
    if (evaluate("shell", command).effect === "deny") return { ok: false, detail: "Command is blocked." };
    if (!canAutoShell(mode, command) && !approved && evaluate("shell", command).effect !== "allow") {
      return { ok: true, detail: "", pending: { name, args } };
    }
    const r = await execInFolder(folder, command);
    return { ok: r.ok, detail: `${r.stdout}\n${r.stderr}`.trim().slice(0, 8_000) };
  }
  if (name === "todo") {
    const items = args.items || "";
    await writeWorkspaceFile({ data: { folder, rel: ".sutra/todos.md", content: `# Todos for this request\n\n${items}\n` } });
    return { ok: true, detail: items.slice(0, 1500) || "(empty todo list)" };
  }
  if (name === "spawn") {
    if (depth >= 1) return { ok: false, detail: "Workers cannot spawn further workers." };
    const inner = await runLoop({
      folder,
      mode,
      modelId: undefined,
      system: `You are a worker with your own context. You are not the IDE. Complete this goal only. Use read/grep/glob then edit. Do not spawn.`,
      prompt: args.goal || "",
      tools: TOOLS.filter((t) => t.function.name !== "spawn"),
      allowed: allowed.filter((t) => t !== "spawn"),
      depth: 1,
      rounds: 6,
    });
    if (!inner.ok) return { ok: false, detail: inner.error };
    return { ok: true, detail: `${inner.text}\n${inner.trace.map((t) => `${t.name}: ${t.detail}`).join("\n")}`.slice(0, 8000) };
  }
  return { ok: false, detail: `Unknown tool ${name}` };
}

function resolveEndpoint(modelId?: string) {
  const all = DEFAULT_PLATFORM.models;
  return all.find((m) => m.id === modelId && m.enabled) ?? all.find((m) => m.enabled) ?? all[0]!;
}

type LoopOk = { ok: true; text: string; trace: AgentTrace[]; pending?: AgentPending };
type LoopFail = { ok: false; error: string };

async function runLoop(input: {
  folder: string;
  mode: AgentMode;
  modelId?: string;
  system: string;
  prompt: string;
  tools: ToolDef[];
  allowed: AgentTool[];
  approved?: AgentPending;
  depth: number;
  rounds: number;
}): Promise<LoopOk | LoopFail> {
  const messages: unknown[] = [
    { role: "system", content: input.system },
    { role: "user", content: input.prompt },
  ];
  const trace: AgentTrace[] = [];
  let approved = Boolean(input.approved);

  if (input.approved) {
    const done = await execTool(input.folder, input.mode, input.approved.name, input.approved.args, true, input.allowed, input.depth);
    trace.push({ name: input.approved.name, ok: done.ok, detail: done.detail.slice(0, 400) });
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [{ id: "approved", type: "function", function: { name: input.approved.name, arguments: JSON.stringify(input.approved.args) } }],
    });
    messages.push({ role: "tool", tool_call_id: "approved", content: done.detail.slice(0, 8000) });
  }

  for (let i = 0; i < input.rounds; i++) {
    const chat = await chatWithTools(resolveEndpoint(input.modelId), messages, input.tools);
    if (!chat.ok) return { ok: false, error: chat.error };

    let calls = chat.toolCalls ?? [];
    if (!calls.length && chat.text) {
      const fb = parseFallback(chat.text);
      if (fb?.final) return { ok: true, text: fb.final, trace };
      if (fb?.tool) calls = [{ id: `fb_${i}`, name: fb.tool, arguments: JSON.stringify(fb.args ?? {}) }];
    }
    if (!calls.length) return { ok: true, text: chat.text || "Done.", trace };

    messages.push({
      role: "assistant",
      content: chat.text || null,
      tool_calls: calls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.arguments },
      })),
    });

    for (const call of calls) {
      const args = parseArgs(call.arguments);
      const result = await execTool(input.folder, input.mode, call.name, args, approved, input.allowed, input.depth);
      if (result.pending) return { ok: true, text: chat.text || `Need approval to ${call.name}.`, trace, pending: result.pending };
      trace.push({ name: call.name, ok: result.ok, detail: result.detail.slice(0, 400) });
      messages.push({ role: "tool", tool_call_id: call.id, content: result.detail.slice(0, 8000) });
    }
    approved = false;
  }
  return { ok: true, text: `Stopped after ${input.rounds} tool rounds. Ask me to continue.`, trace };
}

export const runAgent = createServerFn({ method: "POST" })
  .validator((input: {
    folder: string;
    prompt: string;
    mode: AgentMode;
    modelId?: string;
    agentId?: string;
    history?: { role: string; text: string }[];
    approved?: AgentPending;
  }) => ({
    folder: input.folder,
    prompt: input.prompt.trim().slice(0, 4000),
    mode: input.mode,
    modelId: input.modelId,
    agentId: input.agentId || "default",
    history: input.history ?? [],
    approved: input.approved,
  }))
  .handler(async ({ data }): Promise<LoopOk | LoopFail> => {
    const extra = await loadProjectAgents({ data: { folder: data.folder } });
    const profile = findAgent(data.agentId, extra);
    const tools = TOOLS.filter((t) => profile.tools.includes(t.function.name as AgentTool));
    const mode = profile.mode ?? data.mode;
    const mem = await memory(data.folder);
    let index = "";
    try {
      const listed = await listFolder({ data: { folder: data.folder } });
      index = listed.entries
        .filter((e) => !e.dir)
        .slice(0, 120)
        .map((e) => e.path)
        .join("\n");
    } catch {
      index = "(open a folder first)";
    }
    const historyText = data.history
      .filter((m) => m.role !== "system")
      .slice(-10)
      .map((m) => `${m.role}: ${m.text.slice(0, 300)}`)
      .join("\n");
    const system = `${profile.system}

You are a coding agent in a separate context from the IDE. The host does not know this product. There is no built-in unpaid/leave/budget recipe.

For every request:
1. glob / grep / read until you know what already exists
2. todo — write YOUR task list for this request
3. edit/write to complete those todos (spawn a worker only for a large independent slice)
4. Prefer extending the stack you found. Do not invent a parallel app.

File index (names only — not schema. Open files to learn columns/APIs):
${index || "(empty)"}

Chat history:
${historyText || "(none)"}

Workspace: ${data.folder}
Permission mode: ${mode}. ${mode === "plan" ? "Read only — do not edit." : ""}
${mem}`;

    return runLoop({
      folder: data.folder,
      mode,
      modelId: data.modelId,
      system,
      prompt: data.prompt,
      tools,
      allowed: profile.tools,
      approved: data.approved,
      depth: 0,
      rounds: 12,
    });
  });
