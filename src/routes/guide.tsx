import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-shell";
import guide from "../../docs/DEVELOPER_GUIDE.md?raw";

export const Route = createFileRoute("/guide")({ component: GuidePage });

export function GuidePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader active="guide" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{guide}</pre>
      </main>
    </div>
  );
}
