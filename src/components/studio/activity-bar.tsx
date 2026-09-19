import type { ReactNode } from "react";
import { Blocks, Folder, GitBranch, Search, Settings, Sparkles, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ActivityBar({
  explorer,
  chat,
  onExplorer,
  onChat,
  onSearch,
}: {
  explorer: boolean;
  chat: boolean;
  onExplorer: () => void;
  onChat: () => void;
  onSearch: () => void;
}) {
  const navigate = useNavigate();
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center bg-[var(--color-activity)] py-2">
      <IconBtn label="Explorer" active={explorer} onClick={onExplorer}>
        <Folder className="size-5" />
      </IconBtn>
      <IconBtn label="Search" onClick={onSearch}>
        <Search className="size-5" />
      </IconBtn>
      <IconBtn label="Source Control">
        <GitBranch className="size-5" />
      </IconBtn>
      <IconBtn label="Agent Focus" active={chat} onClick={onChat}>
        <Sparkles className="size-5" />
      </IconBtn>
      <IconBtn label="Extensions" onClick={() => navigate({ to: "/extensions" })}>
        <Blocks className="size-5" />
      </IconBtn>
      <span className="flex-1" />
      <IconBtn label="Account" onClick={() => navigate({ to: "/settings" })}>
        <User className="size-5" />
      </IconBtn>
      <IconBtn label="Settings" onClick={() => navigate({ to: "/settings" })}>
        <Settings className="size-5" />
      </IconBtn>
    </nav>
  );
}

function IconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-11 w-12 items-center justify-center text-subtle hover:text-fg",
        active && "border-l-2 border-accent text-fg",
      )}
    >
      {children}
    </button>
  );
}
