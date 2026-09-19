import type { ModuleSpec, SpecFile, StudioStage } from "./schema";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  prompt: string;
  spec: ModuleSpec | null;
  stage: StudioStage;
  file: SpecFile;
  doneTasks: string[];
};

export function bootSession(): ChatSession {
  return {
    id: "boot",
    title: "New chat",
    updatedAt: 0,
    messages: [
      {
        id: "m0",
        role: "system",
        text: "Sutra IDE. Describe what to build. Specs first, then code. Shell commands need your approval.",
        at: 0,
      },
    ],
    prompt: "",
    spec: null,
    stage: "prompt",
    file: "requirements",
    doneTasks: [],
  };
}

export function newChat(partial?: Partial<ChatSession>): ChatSession {
  return {
    ...bootSession(),
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "system",
        text: "Sutra IDE. Describe what to build. Specs first, then code. Shell commands need your approval.",
        at: Date.now(),
      },
    ],
    ...partial,
  };
}

export function titleFrom(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 36) return t || "New chat";
  return `${t.slice(0, 36)}…`;
}

const KEY = "sutra.chats.v1";

export function loadChatStore(): {
  chats: ChatSession[];
  openIds: string[];
  activeId: string;
} {
  const fresh = newChat();
  if (typeof localStorage === "undefined") {
    return { chats: [fresh], openIds: [fresh.id], activeId: fresh.id };
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as {
      chats?: ChatSession[];
      openIds?: string[];
      activeId?: string;
    } | null;
    if (!raw?.chats?.length) {
      return { chats: [fresh], openIds: [fresh.id], activeId: fresh.id };
    }
    const chats = raw.chats;
    const openIds = (raw.openIds ?? []).filter((id) => chats.some((c) => c.id === id));
    const activeId =
      (raw.activeId && chats.some((c) => c.id === raw.activeId) ? raw.activeId : null) ??
      openIds[0] ??
      chats[0]!.id;
    return {
      chats,
      openIds: openIds.length ? openIds : [activeId],
      activeId,
    };
  } catch {
    return { chats: [fresh], openIds: [fresh.id], activeId: fresh.id };
  }
}

export function saveChatStore(chats: ChatSession[], openIds: string[], activeId: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify({ chats, openIds, activeId }));
}
