import { create } from "zustand";
import type { ModuleSpec, ShellOs, SpecFile, StudioStage } from "./schema";
import {
  evaluate,
  loadPersisted,
  savePersisted,
  type PermissionRule,
} from "./permissions";
import {
  bootSession,
  loadChatStore,
  newChat,
  saveChatStore,
  titleFrom,
  type ChatMessage,
  type ChatSession,
} from "./chats";

export type TermLine = { kind: "in" | "out" | "err" | "sys"; text: string };

export type PendingShell = {
  command: string;
  query?: string;
};

type SutraState = {
  chats: ChatSession[];
  openIds: string[];
  activeId: string;
  prompt: string;
  stage: StudioStage;
  file: SpecFile;
  spec: ModuleSpec | null;
  error: string | null;
  busy: boolean;
  runningTask: string | null;
  doneTasks: string[];
  os: ShellOs;
  termLines: TermLine[];
  termBusy: boolean;
  sessionRules: PermissionRule[];
  userRules: PermissionRule[];
  workspaceRules: Record<string, PermissionRule[]>;
  pending: PendingShell | null;
  persistOpen: boolean;
  persistEffect: "allow" | "deny";
  setPrompt: (v: string) => void;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSpec: (spec: ModuleSpec) => void;
  setStage: (s: StudioStage) => void;
  setFile: (f: SpecFile) => void;
  markTask: (id: string) => void;
  setRunningTask: (id: string | null) => void;
  setOs: (os: ShellOs) => void;
  pushTerm: (line: TermLine) => void;
  clearTerm: () => void;
  setTermBusy: (v: boolean) => void;
  setPending: (p: PendingShell | null) => void;
  setPersistOpen: (open: boolean, effect?: "allow" | "deny") => void;
  addRule: (rule: PermissionRule, slug: string) => void;
  allRules: (slug: string) => PermissionRule[];
  decideShell: (command: string, slug: string) => "deny" | "ask" | "allow";
  addMessage: (msg: Omit<ChatMessage, "id" | "at">) => void;
  newChatTab: () => void;
  openChat: (id: string) => void;
  closeTab: (id: string) => void;
  deleteChat: (id: string) => void;
  hydrateChats: () => void;
  reset: () => void;
};

const bootOs = (): ShellOs =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "macos" : "windows";

const persisted = loadPersisted();
const boot = bootSession();

function persist(s: Pick<SutraState, "chats" | "openIds" | "activeId">) {
  saveChatStore(s.chats, s.openIds, s.activeId);
}

function patchActive(s: SutraState, patch: Partial<ChatSession>): ChatSession[] {
  return s.chats.map((c) => (c.id === s.activeId ? { ...c, ...patch, updatedAt: Date.now() } : c));
}

export const useSutra = create<SutraState>((set, get) => ({
  chats: [boot],
  openIds: [boot.id],
  activeId: boot.id,
  prompt: boot.prompt,
  stage: boot.stage,
  file: boot.file,
  spec: boot.spec,
  error: null,
  busy: false,
  runningTask: null,
  doneTasks: boot.doneTasks,
  os: bootOs(),
  termLines: [],
  termBusy: false,
  sessionRules: [],
  userRules: persisted.user,
  workspaceRules: persisted.workspace,
  pending: null,
  persistOpen: false,
  persistEffect: "allow",
  setPrompt: (prompt) =>
    set((s) => {
      const chats = patchActive(s, { prompt });
      persist({ ...s, chats });
      return { prompt, chats };
    }),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  setSpec: (spec) =>
    set((s) => {
      const chats = patchActive(s, {
        spec,
        stage: "requirements",
        file: "requirements",
        title: spec.name || s.chats.find((c) => c.id === s.activeId)?.title || "Chat",
      });
      persist({ ...s, chats });
      return {
        spec,
        stage: "requirements" as const,
        file: "requirements" as const,
        error: null,
        doneTasks: [],
        runningTask: null,
        termLines: [],
        pending: null,
        persistOpen: false,
        chats,
      };
    }),
  setStage: (stage) =>
    set((s) => {
      const chats = patchActive(s, { stage });
      persist({ ...s, chats });
      return { stage, chats };
    }),
  setFile: (file) =>
    set((s) => {
      const chats = patchActive(s, { file });
      persist({ ...s, chats });
      return { file, chats };
    }),
  markTask: (id) =>
    set((s) => {
      const doneTasks = s.doneTasks.includes(id) ? s.doneTasks : [...s.doneTasks, id];
      const chats = patchActive(s, { doneTasks });
      persist({ ...s, chats });
      return { doneTasks, chats };
    }),
  setRunningTask: (runningTask) => set({ runningTask }),
  setOs: (os) => set({ os }),
  pushTerm: (line) => set((s) => ({ termLines: [...s.termLines.slice(-200), line] })),
  clearTerm: () => set({ termLines: [] }),
  setTermBusy: (termBusy) => set({ termBusy }),
  setPending: (pending) => set({ pending, persistOpen: pending ? get().persistOpen : false }),
  setPersistOpen: (persistOpen, effect) =>
    set({ persistOpen, persistEffect: effect ?? get().persistEffect }),
  allRules: (slug) => {
    const s = get();
    return [...s.userRules, ...(s.workspaceRules[slug] ?? []), ...s.sessionRules];
  },
  decideShell: (command, slug) => evaluate("shell", command, get().allRules(slug)).effect,
  addRule: (rule, slug) => {
    set((s) => {
      let userRules = s.userRules;
      let sessionRules = s.sessionRules;
      let workspaceRules = s.workspaceRules;
      if (rule.scope === "user") userRules = [...userRules, rule];
      else if (rule.scope === "workspace") {
        workspaceRules = {
          ...workspaceRules,
          [slug]: [...(workspaceRules[slug] ?? []), rule],
        };
      } else sessionRules = [...sessionRules, { ...rule, scope: "session" }];
      savePersisted(userRules, workspaceRules);
      return { userRules, workspaceRules, sessionRules };
    });
  },
  addMessage: (msg) =>
    set((s) => {
      const message: ChatMessage = { ...msg, id: crypto.randomUUID(), at: Date.now() };
      const cur = s.chats.find((c) => c.id === s.activeId);
      const title =
        msg.role === "user" && cur && (cur.title === "New chat" || !cur.title)
          ? titleFrom(msg.text)
          : cur?.title;
      const chats = patchActive(s, {
        messages: [...(cur?.messages ?? []), message],
        title,
        prompt: msg.role === "user" ? msg.text : cur?.prompt,
      });
      persist({ ...s, chats });
      return {
        chats,
        prompt: msg.role === "user" ? msg.text : s.prompt,
      };
    }),
  newChatTab: () =>
    set((s) => {
      const chat = newChat();
      const chats = [chat, ...s.chats].slice(0, 40);
      const openIds = [chat.id, ...s.openIds.filter((id) => id !== chat.id)].slice(0, 8);
      persist({ chats, openIds, activeId: chat.id });
      return {
        chats,
        openIds,
        activeId: chat.id,
        prompt: "",
        spec: null,
        stage: "prompt",
        file: "requirements",
        doneTasks: [],
        error: null,
        pending: null,
        termLines: [],
      };
    }),
  openChat: (id) =>
    set((s) => {
      const chat = s.chats.find((c) => c.id === id);
      if (!chat) return s;
      const openIds = s.openIds.includes(id) ? s.openIds : [...s.openIds, id].slice(0, 8);
      persist({ chats: s.chats, openIds, activeId: id });
      return {
        openIds,
        activeId: id,
        prompt: chat.prompt,
        spec: chat.spec,
        stage: chat.stage,
        file: chat.file,
        doneTasks: chat.doneTasks,
        error: null,
        pending: null,
        termLines: [],
      };
    }),
  closeTab: (id) =>
    set((s) => {
      const openIds = s.openIds.filter((x) => x !== id);
      let activeId = s.activeId;
      let extra: Partial<SutraState> = {};
      if (id === s.activeId) {
        activeId = openIds[0] ?? s.chats[0]?.id ?? id;
        const chat = s.chats.find((c) => c.id === activeId);
        if (chat) {
          extra = {
            prompt: chat.prompt,
            spec: chat.spec,
            stage: chat.stage,
            file: chat.file,
            doneTasks: chat.doneTasks,
          };
        }
      }
      persist({ chats: s.chats, openIds: openIds.length ? openIds : [activeId], activeId });
      return { openIds: openIds.length ? openIds : [activeId], activeId, ...extra };
    }),
  deleteChat: (id) =>
    set((s) => {
      let chats = s.chats.filter((c) => c.id !== id);
      if (!chats.length) chats = [newChat()];
      let openIds = s.openIds.filter((x) => x !== id);
      let activeId = s.activeId === id ? (openIds[0] ?? chats[0]!.id) : s.activeId;
      if (!openIds.includes(activeId)) openIds = [activeId, ...openIds];
      const chat = chats.find((c) => c.id === activeId)!;
      persist({ chats, openIds, activeId });
      return {
        chats,
        openIds,
        activeId,
        prompt: chat.prompt,
        spec: chat.spec,
        stage: chat.stage,
        file: chat.file,
        doneTasks: chat.doneTasks,
        error: null,
      };
    }),
  hydrateChats: () => {
    const loaded = loadChatStore();
    const chat = loaded.chats.find((c) => c.id === loaded.activeId) ?? loaded.chats[0]!;
    set({
      chats: loaded.chats,
      openIds: loaded.openIds,
      activeId: loaded.activeId,
      prompt: chat.prompt,
      spec: chat.spec,
      stage: chat.stage,
      file: chat.file,
      doneTasks: chat.doneTasks,
    });
  },
  reset: () => {
    get().newChatTab();
  },
}));
