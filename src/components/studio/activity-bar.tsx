import type { ReactNode } from "react";
import { Blocks, Folder, GitBranch, Search, Settings, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type SidePanel = "explorer" | "search" | "scm" | "chat";

export function ActivityBar({
  side,
  chat,
  onSide,
  onChat,
}: {
  side: SidePanel;
  chat: boolean;
  onSide: (s: SidePanel) => void;
  onChat: () => void;
}) {
  const navigate = useNavigate();
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center bg-[var(--color-activity)] py-2">
      <IconBtn label="Explorer" active={side === "explorer"} onClick={() => onSide("explorer")}>
        <Folder className="size-5" />
      </IconBtn>
      <IconBtn label="Search" active={side === "search"} onClick={() => onSide("search")}>
        <Search className="size-5" />
      </IconBtn>
      <IconBtn label="Source Control" active={side === "scm"} onClick={() => onSide("scm")}>
        <GitBranch className="size-5" />
      </IconBtn>
      <IconBtn label="Agent Focus" active={chat} onClick={onChat}>
        <Sparkles className="size-5" />
      </IconBtn>
      <IconBtn label="Extensions" onClick={() => navigate({ to: "/extensions" })}>
        <Blocks className="size-5" />
      </IconBtn>
      <span className="flex-1" />
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
