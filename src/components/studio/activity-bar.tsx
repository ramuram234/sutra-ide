import type { ReactNode } from "react";
import { Blocks, Bug, Folder, GitBranch, Search, Settings, Sparkles, Waypoints } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { SideView } from "@/lib/sutra/workbench";
import { cn } from "@/lib/utils";

export function ActivityBar({
  side,
  chat,
  scmCount,
  onSide,
  onChat,
}: {
  side: SideView;
  chat: boolean;
  scmCount?: number;
  onSide: (s: SideView) => void;
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
      <IconBtn label="Source Control" active={side === "scm"} onClick={() => onSide("scm")} badge={scmCount}>
        <GitBranch className="size-5" />
      </IconBtn>
      <IconBtn label="Run and Debug" active={side === "debug"} onClick={() => onSide("debug")}>
        <Bug className="size-5" />
      </IconBtn>
      <IconBtn label="Kiro" active={side === "kiro"} onClick={() => onSide("kiro")}>
        <Waypoints className="size-5" />
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
  badge,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex h-11 w-12 items-center justify-center text-subtle hover:text-fg",
        active && "border-l-2 border-accent text-fg",
      )}
    >
      {children}
      {badge ? (
        <span className="absolute top-1 right-1 min-w-3 rounded-full bg-accent px-1 text-[9px] text-accent-fg">{badge}</span>
      ) : null}
    </button>
  );
}
