import { Plus, X } from "lucide-react";
import { useSutra } from "@/lib/sutra/store";
import { cn } from "@/lib/utils";

export function ChatTabs() {
  const chats = useSutra((s) => s.chats);
  const openIds = useSutra((s) => s.openIds);
  const activeId = useSutra((s) => s.activeId);
  const openChat = useSutra((s) => s.openChat);
  const closeTab = useSutra((s) => s.closeTab);
  const newChatTab = useSutra((s) => s.newChatTab);
  const open = openIds
    .map((id) => chats.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="flex items-end gap-0 overflow-x-auto border-b border-border">
      {open.map((c) => (
        <div
          key={c.id}
          className={cn(
            "flex h-9 shrink-0 items-center border-r border-border",
            c.id === activeId ? "bg-raised" : "bg-bg",
          )}
        >
          <button
            type="button"
            onClick={() => openChat(c.id)}
            className={cn(
              "h-9 max-w-44 truncate px-3 text-xs",
              c.id === activeId ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {c.title}
          </button>
          <button
            type="button"
            aria-label={`Close ${c.title}`}
            onClick={() => closeTab(c.id)}
            className="h-9 w-7 text-subtle hover:text-fg"
          >
            <X className="mx-auto size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={newChatTab}
        aria-label="New chat tab"
        className="flex h-9 w-9 items-center justify-center text-muted hover:text-fg"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
