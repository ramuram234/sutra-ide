import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INTELLIJ_ACTION,
  INTELLIJ_PLUGIN,
  INTELLIJ_TERMINAL,
  VSCODE_EXT,
  VSCODE_PACKAGE,
} from "@/lib/sutra/extension-source";
import { searchMarketplace, type MarketExt } from "@/lib/sutra/marketplace";

export const Route = createFileRoute("/extensions")({ component: ExtensionsPage });

function ExtensionsPage() {
  const isMac = useMemo(
    () => (typeof navigator !== "undefined" ? /Mac|iPhone|iPad/i.test(navigator.userAgent) : false),
    [],
  );
  const chord = isMac ? "⌘⇧S" : "Ctrl+Shift+S";
  const [tab, setTab] = useState<"market" | "vscode" | "intellij">("market");
  const [q, setQ] = useState("python");
  const [hits, setHits] = useState<MarketExt[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(query: string) {
    setBusy(true);
    try {
      setHits(await searchMarketplace({ data: { query } }));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void search("python");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader active="extensions" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 md:px-6">
        <div>
          <p className="font-display text-3xl tracking-tight">Extensions</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Marketplace search (Open VSX). Sutra-native extensions run here. VS Code VSIX needs an extension host —
            use the Sutra VS Code / IntelliJ add-ons for that.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>Open VSX</Badge>
            <Badge>Windows</Badge>
            <Badge>macOS</Badge>
            <Badge tone="accent">Write specs {chord}</Badge>
          </div>
        </div>

        <div className="flex gap-1">
          {(["market", "vscode", "intellij"] as const).map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "secondary"} onClick={() => setTab(t)}>
              {t === "market" ? "Marketplace" : t === "vscode" ? "VS Code host" : "JetBrains host"}
            </Button>
          ))}
        </div>

        {tab === "market" ? (
          <div className="grid gap-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void search(q);
              }}
            >
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Open VSX" />
              <Button type="submit" disabled={busy}>
                Search
              </Button>
            </form>
            {hits.map((e) => (
              <article key={e.id} className="rounded-md bg-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{e.name}</p>
                  <Badge>{e.sutra ? "Sutra" : "VS Code"}</Badge>
                </div>
                <p className="text-xs text-subtle">{e.publisher}</p>
                <p className="mt-1 text-xs text-muted">{e.description}</p>
                <p className="mt-2 text-[11px] text-subtle">
                  {e.sutra
                    ? "Runs in Sutra (snippets / keywords / theme)."
                    : "VSIX — install in VS Code, or wait for Sutra extension host."}{" "}
                  {e.downloads ? `${e.downloads.toLocaleString()} downloads` : ""}
                </p>
              </article>
            ))}
          </div>
        ) : tab === "vscode" ? (
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
