import { createServerFn } from "@tanstack/react-start";
import type { ModelEndpoint } from "./platform-config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  ok: true;
  text: string;
  usage: { prompt: number; completion: number };
} | { ok: false; error: string };

function envKey(name: string) {
  return process.env[name]?.trim() || process.env.SUTRA_MODEL_API_KEY?.trim() || process.env.XAI_API_KEY?.trim();
}

export async function chatCompletions(endpoint: ModelEndpoint, messages: ChatMessage[]): Promise<ChatResult> {
  const key = envKey(endpoint.apiKeyEnv);
  const needsKey = endpoint.kind !== "ollama" && endpoint.kind !== "lmstudio";
  if (needsKey && !key) {
    return {
      ok: false,
      error: `No API key. Set ${endpoint.apiKeyEnv} (or SUTRA_MODEL_API_KEY) for ${endpoint.label}.`,
    };
  }

  const url = `${endpoint.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: endpoint.model,
        temperature: 0.25,
        max_tokens: endpoint.maxTokens,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${endpoint.label} ${res.status}: ${body.slice(0, 240)}` };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { ok: false, error: `${endpoint.label} returned an empty completion.` };
    return {
      ok: true,
      text,
      usage: {
        prompt: json.usage?.prompt_tokens ?? 0,
        completion: json.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: `${endpoint.label} failed: ${err instanceof Error ? err.message : "network"}` };
  }
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
