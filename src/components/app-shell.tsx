import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function AppHeader({ active }: { active: "studio" | "extensions" | "settings" | "guide" }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
      <div className="flex items-baseline gap-3">
        <Link to="/" className="font-display text-xl tracking-tight text-fg">
          Sutra
        </Link>
        <p className="hidden text-xs text-muted sm:block">AI software IDE · Windows and macOS</p>
      </div>
      <nav className="flex items-center gap-1">
        <Link
          to="/"
          className={cn(
            "flex h-9 items-center rounded-sm px-3 text-xs font-medium",
            active === "studio" ? "bg-raised text-fg" : "text-muted hover:text-fg",
          )}
        >
          Studio
        </Link>
        <Link
          to="/settings"
          className={cn(
            "flex h-9 items-center rounded-sm px-3 text-xs font-medium",
            active === "settings" ? "bg-raised text-fg" : "text-muted hover:text-fg",
          )}
        >
          Settings
        </Link>
        <Link
          to="/extensions"
          className={cn(
            "flex h-9 items-center rounded-sm px-3 text-xs font-medium",
            active === "extensions" ? "bg-raised text-fg" : "text-muted hover:text-fg",
          )}
        >
          VS Code + JetBrains
        </Link>
      </nav>
    </header>
  );
}
