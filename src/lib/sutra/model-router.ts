import { createServerFn } from "@tanstack/react-start";
import type { ModelEndpoint } from "./platform-config";

export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ToolCall = { id: string; name: string; arguments: string };

export type ChatResult = {
  ok: true;
  text: string;
  usage: { prompt: number; completion: number };
  toolCalls?: ToolCall[];
} | { ok: false; error: string };

function envKey(name: string) {
  return process.env[name]?.trim() || process.env.SUTRA_MODEL_API_KEY?.trim() || process.env.XAI_API_KEY?.trim();
}

async function postChat(
  endpoint: ModelEndpoint,
  body: Record<string, unknown>,
): Promise<ChatResult> {
  const key = envKey(endpoint.apiKeyEnv);
  const needsKey = endpoint.kind !== "ollama" && endpoint.kind !== "lmstudio";
  if (needsKey && !key) {
    return { ok: false, error: `No API key. Set ${endpoint.apiKeyEnv} (or SUTRA_MODEL_API_KEY) for ${endpoint.label}.` };
  }
  const url = `${endpoint.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `${endpoint.label} ${res.status}: ${errBody.slice(0, 240)}` };
    }
    const json = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
        };
      }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const msg = json.choices?.[0]?.message;
    const toolCalls: ToolCall[] = (msg?.tool_calls ?? [])
      .map((c, i) => ({
        id: c.id || `call_${i}`,
        name: c.function?.name ?? "",
        arguments: c.function?.arguments ?? "{}",
      }))
      .filter((c) => c.name);
    const text = msg?.content ?? "";
    if (!text.trim() && !toolCalls.length) return { ok: false, error: `${endpoint.label} returned an empty completion.` };
    return {
      ok: true,
      text,
      toolCalls,
      usage: {
        prompt: json.usage?.prompt_tokens ?? 0,
        completion: json.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: `${endpoint.label} failed: ${err instanceof Error ? err.message : "network"}` };
  }
}

export async function chatCompletions(endpoint: ModelEndpoint, messages: ChatMessage[]): Promise<ChatResult> {
  return postChat(endpoint, {
    model: endpoint.model,
    temperature: 0.25,
    max_tokens: endpoint.maxTokens,
    response_format: { type: "json_object" },
    messages,
  });
}

export async function chatWithTools(
  endpoint: ModelEndpoint,
  messages: unknown[],
  tools: ToolDef[],
): Promise<ChatResult> {
  const first = await postChat(endpoint, {
    model: endpoint.model,
    temperature: 0.2,
    max_tokens: endpoint.maxTokens,
    tools,
    tool_choice: "auto",
    messages,
  });
  if (first.ok || !/tool/i.test(first.error)) return first;
  return postChat(endpoint, {
    model: endpoint.model,
    temperature: 0.2,
    max_tokens: endpoint.maxTokens,
    messages: [
      ...messages,
      {
        role: "system",
        content:
          'If you need a tool, reply with JSON {"tool":"read|write|edit|glob|grep|bash","args":{...}}. If done, {"final":"markdown answer"}.',
      },
    ],
  });
}

export const listModelStatus = createServerFn({ method: "GET" }).handler(async () => {
  const keys = [
    "XAI_API_KEY",
    "OPENAI_API_KEY",
    "SUTRA_MODEL_API_KEY",
    "AWS_BEARER_TOKEN_BEDROCK",
    "AZURE_OPENAI_API_KEY",
    "OLLAMA_API_KEY",
  ];
  return Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k]?.trim())]));
});
