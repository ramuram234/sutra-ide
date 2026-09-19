import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  INTELLIJ_ACTION,
  INTELLIJ_PLUGIN,
  INTELLIJ_TERMINAL,
  VSCODE_EXT,
  VSCODE_PACKAGE,
} from "@/lib/sutra/extension-source";

export const Route = createFileRoute("/extensions")({ component: ExtensionsPage });

function ExtensionsPage() {
  const isMac = useMemo(
    () => (typeof navigator !== "undefined" ? /Mac|iPhone|iPad/i.test(navigator.userAgent) : false),
    [],
  );
  const chord = isMac ? "⌘⇧S" : "Ctrl+Shift+S";
  const [tab, setTab] = useState<"vscode" | "intellij">("vscode");

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader active="extensions" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 md:px-6">
        <div>
          <p className="font-display text-3xl tracking-tight">VS Code and JetBrains</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Same chats, specs, and command approval as Studio. History and tabs live in the IDE; the
            extension runs shell on your Windows or Mac laptop after Allow / Allow this workspace / Deny.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>Windows</Badge>
            <Badge>macOS</Badge>
            <Badge tone="accent">Write specs {chord}</Badge>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-lg bg-raised p-4 shadow-[var(--shadow-border)]">
            <p className="text-sm font-medium">Sutra for VS Code</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Sidebar: specs. Command palette writes specs and runs commands in the integrated terminal
              (cmd.exe on Windows, zsh on macOS).
            </p>
            <p className="mt-3 font-mono text-xs text-subtle">
              GitHub → Actions → vscode-vsix, then Install from VSIX
            </p>
          </article>
          <article className="rounded-lg bg-raised p-4 shadow-[var(--shadow-border)]">
            <p className="text-sm font-medium">Sutra for IntelliJ</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Tool window plus “Run command in terminal” — uses cmd.exe or macOS Terminal from the IDE.
            </p>
            <p className="mt-3 font-mono text-xs text-subtle">
              GitHub → Actions → intellij-plugin → Install Plugin from Disk
            </p>
          </article>
        </section>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant={tab === "vscode" ? "default" : "secondary"}
            onClick={() => setTab("vscode")}
          >
            VS Code source
          </Button>
          <Button
            size="sm"
            variant={tab === "intellij" ? "default" : "secondary"}
            onClick={() => setTab("intellij")}
          >
            JetBrains source
          </Button>
        </div>

        {tab === "vscode" ? (
          <div className="grid gap-4">
            <CodeBlock filename="package.json" code={VSCODE_PACKAGE} />
            <CodeBlock filename="src/extension.ts" code={VSCODE_EXT} />
          </div>
        ) : (
          <div className="grid gap-4">
            <CodeBlock filename="src/main/resources/META-INF/plugin.xml" code={INTELLIJ_PLUGIN} />
            <CodeBlock filename="src/main/java/dev/sutra/WriteSpecsAction.java" code={INTELLIJ_ACTION} />
            <CodeBlock filename="src/main/java/dev/sutra/RunTerminalAction.java" code={INTELLIJ_TERMINAL} />
          </div>
        )}

        <p className="text-xs text-subtle">
          These are starter manifests for your own build. Point the generate call at your hosted model the same way
          Studio does. Open a project folder, run Write specs, then approve design and tasks in the spec files.
        </p>
      </main>
    </div>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-raised shadow-[var(--shadow-border)]">
      <p className="border-b border-border px-3 py-2 font-mono text-[11px] text-subtle">{filename}</p>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted">{code}</pre>
    </div>
  );
}
