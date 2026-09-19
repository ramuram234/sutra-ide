/**
 * Isolated agent host. Each worker gets its own messages/tools.
 * The IDE never holds this context — only the summary comes back.
 */
import { chatCompletions } from "./model-router";
import { DEFAULT_PLATFORM } from "./platform-config";

export type IsolatedTurn = { agent: string; summary: string };

function endpoint(modelId?: string) {
  const all = DEFAULT_PLATFORM.models;
  return all.find((m) => m.id === modelId && m.enabled) ?? all.find((m) => m.enabled) ?? all[0]!;
}

export async function runIsolatedAgent(input: {
  agent: string;
  system: string;
  user: string;
  modelId?: string;
}): Promise<IsolatedTurn> {
  const chat = await chatCompletions(endpoint(input.modelId), [
    { role: "system", content: input.system.slice(0, 8000) },
    { role: "user", content: input.user.slice(0, 12_000) },
  ]);
  if (!chat.ok) return { agent: input.agent, summary: chat.error };
  return { agent: input.agent, summary: chat.text.slice(0, 2000) };
}
