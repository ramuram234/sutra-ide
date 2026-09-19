import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  FileCode2,
  Folder,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { generateFiles, stackLabel } from "@/lib/sutra/codegen";
import { designMd, permissionsYaml, requirementsMd, tasksMd } from "@/lib/sutra/spec-docs";
import { useSutra } from "@/lib/sutra/store";
import type { SpecFile, StudioStage } from "@/lib/sutra/schema";
import { Button } from "@/components/ui/button";
import { BrowserPreview } from "@/components/studio/browser-preview";
import { bootTerminal, TerminalPane } from "@/components/studio/terminal-pane";
import { ChatSidebar } from "@/components/studio/chat-sidebar";
import { ChatThread } from "@/components/studio/chat-thread";
import { MenuBar } from "@/components/studio/menu-bar";
import { ShortcutsHelp } from "@/components/studio/shortcuts-help";
import { useIdeShortcuts } from "@/components/studio/use-ide-shortcuts";
import { CommandPalette } from "@/components/studio/command-palette";
import { KeybindingsEditor } from "@/components/studio/keybindings-editor";
import { loadUserBindings, shortcutLabel, type IdeAction, type Keybinding } from "@/lib/sutra/keymap";
import { cn } from "@/lib/utils";

const STAGES: { id: StudioStage; label: string }[] = [
  { id: "prompt", label: "1 Prompt" },
  { id: "requirements", label: "2 Requirements" },
  { id: "design", label: "3 Design" },
  { id: "tasks", label: "4 Tasks" },
  { id: "implement", label: "5 Preview" },
];

function stageIndex(s: StudioStage) {
  return STAGES.findIndex((x) => x.id === s);
}

export function StudioApp() {
  const store = useSutra();
  const {
    spec,
    stage,
    setStage,
    file,
    setFile,
    doneTasks,
    markTask,
    runningTask,
    setRunningTask,
    os,
    hydrateChats,
    newChatTab,
  } = store;
  const [codeTab, setCodeTab] = useState<"react" | "api">("react");
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showTerm, setShowTerm] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [palette, setPalette] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [find, setFind] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [userKeys, setUserKeys] = useState<Keybinding[]>([]);
  const [openTabs, setOpenTabs] = useState<SpecFile[]>([]);
  const files = spec ? generateFiles(spec) : [];

  useEffect(() => {
    hydrateChats();
    setUserKeys(loadUserBindings());
  }, [hydrateChats]);

  useEffect(() => {
    if (!spec) return;
    setOpenTabs((tabs) => (tabs.includes("requirements") ? tabs : ["requirements", ...tabs]));
  }, [spec?.slug]);

  function openFile(f: SpecFile, s: StudioStage) {
    setStage(s);
    setFile(f);
    setOpenTabs((tabs) => (tabs.includes(f) ? tabs : [...tabs, f]));
  }

  function approve() {
    if (stage === "requirements") {
      setStage("design");
      openFile("design", "design");
    } else if (stage === "design") {
      setStage("tasks");
      openFile("tasks", "tasks");
    }
  }

  async function runTasks() {
    if (!spec) return;
    for (const t of spec.tasks) {
      setRunningTask(t.id);
      await new Promise((r) => setTimeout(r, 420));
      markTask(t.id);
    }
    setRunningTask(null);
    setStage("implement");
    openFile("react", "implement");
    setShowTerm(true);
    await bootTerminal(spec.slug, os, generateFiles(spec));
  }

  useIdeShortcuts(
    os,
    {
      newChat: () => newChatTab(),
      closeEditor: () => setOpenTabs((t) => t.filter((x) => x !== file)),
      toggleExplorer: () => setShowExplorer((v) => !v),
      toggleChat: () => setShowChat((v) => !v),
      toggleTerminal: () => setShowTerm((v) => !v),
      runTasks: () => void runTasks(),
      showShortcuts: () => setShowKeys((v) => !v),
      commandPalette: () => setPalette(true),
      showKeybindings: () => openFile("keybindings", spec ? stage : "prompt"),
      quickOpen: () => setQuickOpen(true),
      save: () => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1200);
      },
      find: () => setFind(""),
    },
    userKeys,
  );

  const canOpen = (id: StudioStage) => {
    if (id === "prompt") return true;
    if (!spec) return false;
    return stageIndex(id) <= stageIndex(stage);
  };

  const menus = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New Chat", shortcut: shortcutLabel("newChat", os, userKeys), onSelect: () => newChatTab() },
        { label: "Close Editor", shortcut: shortcutLabel("closeEditor", os, userKeys), onSelect: () => setOpenTabs((t) => t.filter((x) => x !== file)) },
        { sep: true, label: "" },
        { label: "Save", shortcut: shortcutLabel("save", os, userKeys), onSelect: () => setSaved(true) },
        { label: "Command Palette…", shortcut: shortcutLabel("commandPalette", os, userKeys), onSelect: () => setPalette(true) },
        { label: "Preferences: Keyboard Shortcuts", shortcut: shortcutLabel("showKeybindings", os, userKeys), onSelect: () => openFile("keybindings", spec ? stage : "prompt") },
        { label: "Settings…", onSelect: () => { window.location.href = "/settings"; } },
        { label: "Developer guide", onSelect: () => { window.location.href = "/guide"; } },
        { label: "Extensions…", onSelect: () => { window.location.href = "/extensions"; } },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Find", shortcut: shortcutLabel("find", os, userKeys), onSelect: () => setFind("") },
        { label: "Undo", shortcut: "Ctrl+Z" },
        { label: "Copy", shortcut: "Ctrl+C" },
        { label: "Paste", shortcut: "Ctrl+V" },
      ],
    },
    {
      id: "selection",
      label: "Selection",
      items: [{ label: "Select All", shortcut: "Ctrl+A" }],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: showExplorer ? "Hide Explorer" : "Show Explorer", shortcut: shortcutLabel("toggleExplorer", os, userKeys), onSelect: () => setShowExplorer((v) => !v) },
        { label: showChat ? "Hide Chat" : "Show Chat", shortcut: shortcutLabel("toggleChat", os, userKeys), onSelect: () => setShowChat((v) => !v) },
        { label: showTerm ? "Hide Terminal" : "Show Terminal", shortcut: shortcutLabel("toggleTerminal", os, userKeys), onSelect: () => setShowTerm((v) => !v) },
      ],
    },
    {
      id: "go",
      label: "Go",
      items: [
        { label: "Go to File…", shortcut: shortcutLabel("quickOpen", os, userKeys), onSelect: () => setQuickOpen(true) },
        { label: "requirements.md", onSelect: () => spec && openFile("requirements", "requirements") },
        { label: "design.md", onSelect: () => spec && canOpen("design") && openFile("design", "design") },
        { label: "tasks.md", onSelect: () => spec && canOpen("tasks") && openFile("tasks", "tasks") },
      ],
    },
    {
      id: "run",
      label: "Run",
      items: [{ label: "Run Tasks", shortcut: shortcutLabel("runTasks", os, userKeys), onSelect: () => void runTasks() }],
    },
    {
      id: "terminal",
      label: "Terminal",
      items: [
        { label: "New Terminal", onSelect: () => setShowTerm(true) },
        { label: "Close Terminal", onSelect: () => setShowTerm(false) },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Keyboard Shortcuts", shortcut: shortcutLabel("showShortcuts", os, userKeys), onSelect: () => setShowKeys(true) },
        { label: "Open Keyboard Shortcuts editor", shortcut: shortcutLabel("showKeybindings", os, userKeys), onSelect: () => openFile("keybindings", spec ? stage : "prompt") },
        { label: "Sutra IDE — specs, editor, chat, approved shell" },
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <MenuBar menus={menus} />
      <div
        className={cn(
          "grid min-h-0 flex-1",
          showExplorer && showChat && "lg:grid-cols-[16rem_1fr_22rem]",
          showExplorer && !showChat && "lg:grid-cols-[16rem_1fr]",
          !showExplorer && showChat && "lg:grid-cols-[1fr_22rem]",
        )}
      >
        {showExplorer ? (
          <aside className="flex min-h-0 flex-col border-b border-border lg:border-r lg:border-b-0">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-subtle">Explorer</p>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              <p className="px-2 pb-1 font-mono text-xs text-muted">
                {spec ? `${spec.slug} · ${stackLabel(spec.stack)}` : "workspace"}
              </p>
              {spec ? (
                <SpecTree
                  file={file}
                  stage={stage}
                  setFile={(f) => openFile(f, fileStage(f, stage))}
                  setStage={setStage}
                  hasCode={stage === "implement"}
                  srcNames={files.map((f) => f.path.split("/").pop() ?? f.path)}
                />
              ) : (
                <>
                  <p className="px-2 text-xs text-subtle">
                    No folder yet. Chat: Spec or Vibe. Any language — Python, Java, Go, C#, PHP, Rust, Ruby,
                    Kotlin, React.
                  </p>
                  <TreeItem
                    active={file === "keybindings"}
                    locked={false}
                    onClick={() => openFile("keybindings", "prompt")}
                  >
                    keybindings.json
                  </TreeItem>
                </>
              )}
            </div>
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex h-9 items-center overflow-x-auto border-b border-border">
            {openTabs.length === 0 ? (
              <p className="px-3 text-xs text-subtle">No file open</p>
            ) : (
              openTabs.map((tab) => (
                <div
                  key={tab}
                  className={cn(
                    "flex h-9 shrink-0 items-center border-r border-border",
                    file === tab ? "bg-raised" : "",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openFile(tab, fileStage(tab, stage))}
                    className="h-9 px-3 font-mono text-xs"
                  >
                    {tabLabel(tab)}
                  </button>
                  <button
                    type="button"
                    aria-label={`Close ${tab}`}
                    onClick={() => setOpenTabs((tabs) => tabs.filter((t) => t !== tab))}
                    className="h-9 w-7 text-subtle hover:text-fg"
                  >
                    <X className="mx-auto size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {find !== null ? (
              <div className="flex items-center gap-2 border-b border-border px-3 py-1">
                <input
                  autoFocus
                  className="h-8 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Find"
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setFind(null);
                  }}
                />
              </div>
            ) : null}
            <EditorBody
              spec={spec}
              file={file}
              stage={stage}
              files={files}
              codeTab={codeTab}
              setCodeTab={setCodeTab}
              doneTasks={doneTasks}
              runningTask={runningTask}
              onApprove={approve}
              onRunTasks={runTasks}
              userKeys={userKeys}
              setUserKeys={setUserKeys}
              find={find ?? ""}
            />
          </div>
          {showTerm ? (
            <div className="h-56 shrink-0 border-t border-border">
              <TerminalPane compact />
            </div>
          ) : null}
        </section>

        {showChat ? (
          <aside className="flex min-h-0 flex-col border-t border-border lg:border-t-0 lg:border-l">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-subtle">Chat</p>
            <div className="h-36 shrink-0 overflow-hidden border-b border-border">
              <ChatSidebar />
            </div>
            <ChatThread />
          </aside>
        ) : null}
      </div>
      <footer className="flex h-7 items-center gap-4 overflow-x-auto border-t border-border px-3 font-mono text-xs text-subtle">
        <span>{os === "macos" ? "macOS" : "Windows"}</span>
        {spec ? <span>{stackLabel(spec.stack)}</span> : null}
        {saved ? <span className="text-ok">Saved</span> : <span>Alt+K keymap</span>}
        <span>Alt+P commands</span>
        <span>Ctrl+` terminal</span>
        <span>F5 run</span>
      </footer>
      {showKeys ? <ShortcutsHelp os={os} onClose={() => setShowKeys(false)} /> : null}
      {palette ? (
        <CommandPalette
          onClose={() => setPalette(false)}
          onRun={(id: IdeAction) => {
            if (id === "commandPalette") return;
            const map: Partial<Record<IdeAction, () => void>> = {
              newChat: () => newChatTab(),
              closeEditor: () => setOpenTabs((t) => t.filter((x) => x !== file)),
              toggleExplorer: () => setShowExplorer((v) => !v),
              toggleChat: () => setShowChat((v) => !v),
              toggleTerminal: () => setShowTerm((v) => !v),
              runTasks: () => void runTasks(),
              showShortcuts: () => setShowKeys(true),
              showKeybindings: () => openFile("keybindings", spec ? stage : "prompt"),
              quickOpen: () => setQuickOpen(true),
              save: () => setSaved(true),
              find: () => setFind(""),
            };
            map[id]?.();
          }}
        />
      ) : null}
      {quickOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 p-8" onClick={() => setQuickOpen(false)}>
          <ul className="w-full max-w-lg rounded-md bg-raised py-2 shadow-[var(--shadow-border)]" onClick={(e) => e.stopPropagation()}>
            {(
              [
                ["requirements", "requirements.md"],
                ["design", "design.md"],
                ["tasks", "tasks.md"],
                ["react", files[0]?.path ?? "src"],
                ["api", files[1]?.path ?? "api"],
                ["preview", "preview"],
                ["keybindings", "keybindings.json"],
              ] as [SpecFile, string][]
            ).map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  className="flex h-9 w-full px-3 text-left font-mono text-xs hover:bg-surface"
                  onClick={() => {
                    openFile(id, fileStage(id, stage));
                    setQuickOpen(false);
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function tabLabel(file: SpecFile) {
  if (file === "react") return "src";
  if (file === "api") return "api";
  if (file === "permissions") return "permissions.yaml";
  if (file === "keybindings") return "keybindings.json";
  if (file === "preview") return "preview";
  if (file === "terminal") return "terminal";
  return `${file}.md`;
}

function fileStage(file: SpecFile, current: StudioStage): StudioStage {
  if (file === "requirements") return "requirements";
  if (file === "design") return "design";
  if (file === "tasks") return "tasks";
  if (file === "keybindings") return current;
  if (
    file === "react" ||
    file === "api" ||
    file === "preview" ||
    file === "terminal" ||
    file === "permissions"
  ) {
    return "implement";
  }
  return current;
}

function EditorBody({
  spec,
  file,
  files,
  codeTab,
  setCodeTab,
  doneTasks,
  runningTask,
  onApprove,
  onRunTasks,
  userKeys,
  setUserKeys,
  find,
}: {
  spec: ReturnType<typeof useSutra.getState>["spec"];
  file: SpecFile;
  stage: StudioStage;
  files: ReturnType<typeof generateFiles>;
  codeTab: "react" | "api";
  setCodeTab: (t: "react" | "api") => void;
  doneTasks: string[];
  runningTask: string | null;
  onApprove: () => void;
  onRunTasks: () => void;
  userKeys: Keybinding[];
  setUserKeys: (b: Keybinding[]) => void;
  find: string;
}) {
  if (file === "keybindings") {
    return <KeybindingsEditor user={userKeys} onChange={setUserKeys} />;
  }
  if (!spec) return <EmptyHint />;
  if (file === "requirements") {
    return (
      <DocPane
        filename="specs/requirements.md"
        body={requirementsMd(spec)}
        action="Approve requirements"
        onAction={onApprove}
      />
    );
  }
  if (file === "design") {
    return (
      <DocPane filename="specs/design.md" body={designMd(spec)} action="Approve design" onAction={onApprove} />
    );
  }
  if (file === "tasks") {
    return <TasksPane spec={spec} done={doneTasks} running={runningTask} onRun={onRunTasks} />;
  }
  return <CodePane spec={spec} files={files} codeTab={codeTab} setCodeTab={setCodeTab} file={file} find={find} />;
}

function SpecTree({
  file,
  stage,
  setFile,
  setStage,
  hasCode,
  srcNames,
}: {
  file: SpecFile;
  stage: StudioStage;
  setFile: (f: SpecFile) => void;
  setStage: (s: StudioStage) => void;
  hasCode: boolean;
  srcNames: string[];
}) {
  function open(f: SpecFile, s: StudioStage) {
    if (stageIndex(s) > stageIndex(stage) && !(s === "implement" && hasCode)) return;
    setFile(f);
    setStage(s);
  }
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-subtle">
        <Folder className="size-3.5" />
        specs
      </p>
      <TreeItem active={file === "requirements"} locked={false} onClick={() => open("requirements", "requirements")}>
        requirements.md
      </TreeItem>
      <TreeItem active={file === "design"} locked={stageIndex(stage) < 2} onClick={() => open("design", "design")}>
        design.md
      </TreeItem>
      <TreeItem active={file === "tasks"} locked={stageIndex(stage) < 3} onClick={() => open("tasks", "tasks")}>
        tasks.md
      </TreeItem>
      <p className="mt-4 mb-1 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-subtle">
        <FileCode2 className="size-3.5" />
        src
      </p>
      <TreeItem active={file === "react"} locked={!hasCode} onClick={() => open("react", "implement")}>
        {srcNames[0] ?? "main"}
      </TreeItem>
      <TreeItem active={file === "api"} locked={!hasCode} onClick={() => open("api", "implement")}>
        {srcNames[1] ?? "api"}
      </TreeItem>
      <TreeItem active={file === "preview"} locked={!hasCode} onClick={() => open("preview", "implement")}>
        preview
      </TreeItem>
      <p className="mt-4 mb-1 px-2 text-xs font-medium uppercase tracking-wide text-subtle">.sutra</p>
      <TreeItem
        active={file === "permissions"}
        locked={!hasCode}
        onClick={() => open("permissions", "implement")}
      >
        permissions.yaml
      </TreeItem>
      <TreeItem active={file === "keybindings"} locked={false} onClick={() => open("keybindings", stage)}>
        keybindings.json
      </TreeItem>
    </div>
  );
}

function TreeItem({
  active,
  locked,
  onClick,
  children,
}: {
  active: boolean;
  locked: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center rounded-sm px-2 font-mono text-xs",
        active ? "bg-raised text-fg" : "text-muted hover:text-fg",
        locked && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-4 p-8 md:p-12">
      <p className="font-display text-3xl tracking-tight md:text-4xl">Open a file. Chat on the right.</p>
      <p className="max-w-xl text-sm leading-relaxed text-muted">
        Explorer is the project folder. The center is the editor. Chat generates specs and can run shell
        after you Allow. Terminal sits at the bottom — View → Terminal.
      </p>
    </div>
  );
}

function DocPane({
  filename,
  body,
  action,
  onAction,
}: {
  filename: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="font-mono text-xs text-muted">{filename}</p>
        <Button size="sm" onClick={onAction}>
          {action}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-muted">
        {body}
      </pre>
    </div>
  );
}

function TasksPane({
  spec,
  done,
  running,
  onRun,
}: {
  spec: NonNullable<ReturnType<typeof useSutra.getState>["spec"]>;
  done: string[];
  running: string | null;
  onRun: () => void;
}) {
  if (!spec) return null;
  const allDone = spec.tasks.length > 0 && spec.tasks.every((t) => done.includes(t.id));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="font-mono text-xs text-muted">specs/tasks.md</p>
        <Button size="sm" onClick={onRun} disabled={!!running || allDone}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {running ? `Running ${running}` : allDone ? "Done" : "Run tasks"}
        </Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto p-5">
        {spec.tasks.map((t) => {
          const isDone = done.includes(t.id);
          const isRun = running === t.id;
          return (
            <li key={t.id} className="flex items-start gap-3 border-b border-border py-3 text-sm">
              {isDone ? (
                <Check className="mt-0.5 size-4 text-ok" />
              ) : isRun ? (
                <Loader2 className="mt-0.5 size-4 animate-spin text-accent" />
              ) : (
                <Circle className="mt-0.5 size-4 text-subtle" />
              )}
              <div>
                <p>
                  <span className="font-mono text-xs text-subtle">{t.id}</span>{" "}
                  <span className="text-subtle">{t.owner}</span>
                </p>
                <p className="mt-0.5">{t.title}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PermissionsPane({ slug }: { slug: string }) {
  const extra = useSutra((s) => s.allRules(slug));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-2 font-mono text-xs text-muted">.sutra/permissions.yaml</div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-muted">
        {permissionsYaml(extra)}
      </pre>
    </div>
  );
}

function CodePane({
  spec,
  files,
  file,
  find,
}: {
  spec: NonNullable<ReturnType<typeof useSutra.getState>["spec"]>;
  files: ReturnType<typeof generateFiles>;
  codeTab: "react" | "api";
  setCodeTab: (t: "react" | "api") => void;
  file: SpecFile;
  find: string;
}) {
  if (file === "permissions") return <PermissionsPane slug={spec.slug} />;
  if (file === "preview") return <BrowserPreview spec={spec} />;
  if (file === "terminal") return <TerminalPane />;
  const active = file === "api" ? files[1] : files[0];
  const body = active?.code ?? "";
  const shown = find ? highlightFind(body, find) : body;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-2 font-mono text-xs text-muted">{active?.path}</div>
      <pre className="min-h-0 flex-1 overflow-auto bg-bg p-4 font-mono text-xs leading-relaxed text-muted">
        {shown}
      </pre>
    </div>
  );
}

function highlightFind(body: string, find: string) {
  if (!find) return body;
  return body;
}
