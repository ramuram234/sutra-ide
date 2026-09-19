import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useSutra } from "@/lib/sutra/store";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
  const chats = useSutra((s) => s.chats);
  const activeId = useSutra((s) => s.activeId);
  const openChat = useSutra((s) => s.openChat);
  const newChatTab = useSutra((s) => s.newChatTab);
  const deleteChat = useSutra((s) => s.deleteChat);

  const ordered = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="flex min-h-0 flex-col border-b border-border lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Chats</p>
        <button
          type="button"
          onClick={newChatTab}
          className="flex h-8 items-center gap-1 rounded-sm px-2 text-xs text-muted hover:text-fg"
        >
          <MessageSquarePlus className="size-3.5" />
          New
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {ordered.map((c) => (
          <li key={c.id} className="group relative">
            <button
              type="button"
              onClick={() => openChat(c.id)}
              className={cn(
                "flex h-10 w-full items-center rounded-sm px-2 pr-8 text-left text-xs",
                c.id === activeId ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
            >
              <span className="truncate">{c.title}</span>
            </button>
            <button
              type="button"
              aria-label={`Delete ${c.title}`}
              onClick={() => deleteChat(c.id)}
              className="absolute top-1.5 right-1 hidden h-7 w-7 items-center justify-center rounded-sm text-subtle hover:text-danger group-hover:flex"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
