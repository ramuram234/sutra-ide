import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { canAutoShell, canAutoWrite, type AgentMode } from "./agent-modes";
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
): Promise<{ ok: boolean; detail: string; pending?: AgentPending }> {
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
  return { ok: false, detail: `Unknown tool ${name}` };
}

function resolveEndpoint(modelId?: string) {
  const all = DEFAULT_PLATFORM.models;
  return all.find((m) => m.id === modelId && m.enabled) ?? all.find((m) => m.enabled) ?? all[0]!;
}

export const runAgent = createServerFn({ method: "POST" })
  .validator((input: {
    folder: string;
    prompt: string;
    mode: AgentMode;
    modelId?: string;
    approved?: AgentPending;
  }) => ({
    folder: input.folder,
    prompt: input.prompt.trim().slice(0, 4000),
    mode: input.mode,
    modelId: input.modelId,
    approved: input.approved,
  }))
  .handler(async ({ data }): Promise<{
    ok: true;
    text: string;
    trace: AgentTrace[];
    pending?: AgentPending;
  } | { ok: false; error: string }> => {
    const mem = await memory(data.folder);
    const system = `You are Sutra Code, an agentic coding assistant in a desktop IDE (same loop as Claude Code).
Use tools to gather context, edit, run, then verify. Be concise.
Permission mode: ${data.mode}.
${data.mode === "plan" ? "Do not edit source files. Research and propose a plan." : ""}
Workspace: ${data.folder}
${mem}`;

    const messages: unknown[] = [
      { role: "system", content: system },
      { role: "user", content: data.prompt },
    ];
    const trace: AgentTrace[] = [];
    let approved = Boolean(data.approved);

    if (data.approved) {
      const done = await execTool(data.folder, data.mode, data.approved.name, data.approved.args, true);
      trace.push({ name: data.approved.name, ok: done.ok, detail: done.detail.slice(0, 400) });
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [{ id: "approved", type: "function", function: { name: data.approved.name, arguments: JSON.stringify(data.approved.args) } }],
      });
      messages.push({ role: "tool", tool_call_id: "approved", content: done.detail.slice(0, 8000) });
    }

    for (let i = 0; i < 6; i++) {
      const chat = await chatWithTools(resolveEndpoint(data.modelId), messages, TOOLS);
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
        const result = await execTool(data.folder, data.mode, call.name, args, approved);
        if (result.pending) return { ok: true, text: chat.text || `Need approval to ${call.name}.`, trace, pending: result.pending };
        trace.push({ name: call.name, ok: result.ok, detail: result.detail.slice(0, 400) });
        messages.push({ role: "tool", tool_call_id: call.id, content: result.detail.slice(0, 8000) });
      }
      approved = false;
    }
    return { ok: true, text: "Stopped after 6 tool rounds. Ask me to continue.", trace };
  });
