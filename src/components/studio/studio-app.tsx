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
import { ActivityBar } from "@/components/studio/activity-bar";
import { WelcomePane } from "@/components/studio/welcome-pane";
import { ChatSidebar } from "@/components/studio/chat-sidebar";
import { ChatThread } from "@/components/studio/chat-thread";
import { MenuBar } from "@/components/studio/menu-bar";
import { ShortcutsHelp } from "@/components/studio/shortcuts-help";
import { useIdeShortcuts } from "@/components/studio/use-ide-shortcuts";
import { CommandPalette } from "@/components/studio/command-palette";
import { KeybindingsEditor } from "@/components/studio/keybindings-editor";
import { OpenFolderDialog } from "@/components/studio/open-folder-dialog";
import { ScmPanel } from "@/components/studio/scm-panel";
import { useWorkspace } from "@/components/studio/use-workspace";
import { BottomPanel } from "@/components/studio/bottom-panel";
import { StatusBar } from "@/components/studio/status-bar";
import { CodeEditor } from "@/components/studio/code-editor";
import { ExplorerTree } from "@/components/studio/explorer-tree";
import { KiroPanel } from "@/components/studio/kiro-panel";
import { loadUserBindings, shortcutLabel, type IdeAction, type Keybinding } from "@/lib/sutra/keymap";
import { saveThemePref } from "@/lib/sutra/theme";
import { DEFAULT_LAYOUT, loadLayout, saveLayout, type SideView, type WorkbenchLayout } from "@/lib/sutra/workbench";
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
  const [side, setSide] = useState<SideView>("explorer");
  const [showChat, setShowChat] = useState(true);
  const [showTerm, setShowTerm] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const [palette, setPalette] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [find, setFind] = useState<string | null>(null);
  const [replace, setReplace] = useState<string | null>(null);
  const [goto, setGoto] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [userKeys, setUserKeys] = useState<Keybinding[]>([]);
  const [zoom, setZoom] = useState(1);
  const [layout, setLayout] = useState<WorkbenchLayout>(DEFAULT_LAYOUT);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [output, setOutput] = useState("Sutra ready.");
  const ws = useWorkspace();
  const [openTabs, setOpenTabs] = useState<SpecFile[]>([]);
  const files = spec ? generateFiles(spec) : [];

  useEffect(() => {
    hydrateChats();
    setUserKeys(loadUserBindings());
    setLayout(loadLayout());
  }, [hydrateChats]);

  function patchLayout(p: Partial<WorkbenchLayout>) {
    setLayout((prev) => {
      const next = { ...prev, ...p };
      saveLayout(next);
      return next;
    });
  }

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
        void ws.saveDoc().then((ok) => {
          setSaved(Boolean(ok));
          window.setTimeout(() => setSaved(false), 1200);
        });
      },
      find: () => setFind(""),
      findInFiles: () => setPalette(true),
      showSettings: () => {
        window.location.href = "/settings";
      },
      toggleFullscreen: () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      },
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
        { label: "New File", shortcut: "Ctrl+N", onSelect: () => void ws.newFile() },
        { label: "New Window", shortcut: "Ctrl+Shift+N", onSelect: () => void ws.newWindow() },
        { sep: true, label: "" },
        { label: "Open File…", shortcut: "Ctrl+O", onSelect: () => void ws.openFileDialog() },
        { label: "Open Folder…", shortcut: "Ctrl+K Ctrl+O", onSelect: () => void ws.openFolder() },
        { label: "Add Folder to Workspace…", onSelect: () => void ws.addFolder() },
        { sep: true, label: "" },
        { label: "Save", shortcut: shortcutLabel("save", os, userKeys), onSelect: () => void ws.saveDoc().then((ok) => ok && setSaved(true)) },
        { label: "Save As…", shortcut: "Ctrl+Shift+S", onSelect: () => void ws.saveDocAs() },
        { sep: true, label: "" },
        { label: "Close Editor", shortcut: shortcutLabel("closeEditor", os, userKeys), onSelect: () => {
          if (ws.activeDoc) ws.closeDoc(ws.activeDoc);
          else setOpenTabs((t) => t.filter((x) => x !== file));
        } },
        { label: "Close Folder", onSelect: () => void ws.closeFolder() },
        { sep: true, label: "" },
        { label: "Settings…", shortcut: shortcutLabel("showSettings", os, userKeys), onSelect: () => { window.location.href = "/settings"; } },
        { label: "Exit", onSelect: () => void ws.quit() },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", onSelect: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "Ctrl+Y", onSelect: () => document.execCommand("redo") },
        { sep: true, label: "" },
        { label: "Cut", shortcut: "Ctrl+X", onSelect: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", onSelect: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", onSelect: () => document.execCommand("paste") },
        { sep: true, label: "" },
        { label: "Find", shortcut: shortcutLabel("find", os, userKeys), onSelect: () => setFind("") },
        { label: "Replace", shortcut: "Ctrl+H", onSelect: () => setReplace("") },
      ],
    },
    {
      id: "selection",
      label: "Selection",
      items: [{ label: "Select All", shortcut: "Ctrl+A", onSelect: () => document.execCommand("selectAll") }],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Command Palette…", shortcut: shortcutLabel("commandPalette", os, userKeys), onSelect: () => setPalette(true) },
        { sep: true, label: "" },
        { label: "Explorer", shortcut: "Ctrl+Shift+E", onSelect: () => { setSide("explorer"); patchLayout({ sidebar: true }); setShowExplorer(true); } },
        { label: "Search", shortcut: "Ctrl+Shift+F", onSelect: () => { setSide("search"); patchLayout({ sidebar: true }); } },
        { label: "Source Control", shortcut: "Ctrl+Shift+G", onSelect: () => { setSide("scm"); patchLayout({ sidebar: true }); } },
        { label: "Run and Debug", shortcut: "Ctrl+Shift+D", onSelect: () => { setSide("debug"); patchLayout({ sidebar: true }); } },
        { label: "Kiro", onSelect: () => { setSide("kiro"); patchLayout({ sidebar: true }); } },
        { label: showChat ? "Hide Agent Focus" : "Show Agent Focus", shortcut: shortcutLabel("toggleChat", os, userKeys), onSelect: () => setShowChat((v) => !v) },
        { sep: true, label: "" },
        { label: "Problems", shortcut: "Ctrl+Shift+M", onSelect: () => { patchLayout({ panel: true, panelTab: "problems" }); setShowTerm(true); } },
        { label: "Output", onSelect: () => { patchLayout({ panel: true, panelTab: "output" }); setShowTerm(true); } },
        { label: "Debug Console", onSelect: () => { patchLayout({ panel: true, panelTab: "debug" }); setShowTerm(true); } },
        { label: "Terminal", shortcut: shortcutLabel("toggleTerminal", os, userKeys), onSelect: () => { patchLayout({ panel: !layout.panel, panelTab: "terminal" }); setShowTerm((v) => !v); } },
        { sep: true, label: "" },
        { label: layout.menuBar ? "Hide Menu Bar" : "Show Menu Bar", onSelect: () => patchLayout({ menuBar: !layout.menuBar }) },
        { label: layout.activityBar ? "Hide Activity Bar" : "Show Activity Bar", onSelect: () => patchLayout({ activityBar: !layout.activityBar }) },
        { label: layout.sidebar ? "Hide Primary Side Bar" : "Show Primary Side Bar", shortcut: "Ctrl+B", onSelect: () => { patchLayout({ sidebar: !layout.sidebar }); setShowExplorer((v) => !v); } },
        { label: "Move Primary Side Bar Right", onSelect: () => patchLayout({ sidebarRight: !layout.sidebarRight }) },
        { label: layout.statusBar ? "Hide Status Bar" : "Show Status Bar", onSelect: () => patchLayout({ statusBar: !layout.statusBar }) },
        { label: layout.breadcrumbs ? "Hide Breadcrumbs" : "Show Breadcrumbs", onSelect: () => patchLayout({ breadcrumbs: !layout.breadcrumbs }) },
        { label: layout.zen ? "Exit Zen Mode" : "Zen Mode", shortcut: "Ctrl+K Z", onSelect: () => patchLayout({ zen: !layout.zen }) },
        { sep: true, label: "" },
        { label: layout.wordWrap ? "Disable Word Wrap" : "Word Wrap", shortcut: "Alt+Z", onSelect: () => patchLayout({ wordWrap: !layout.wordWrap }) },
        { label: layout.lineNumbers ? "Hide Line Numbers" : "Show Line Numbers", onSelect: () => patchLayout({ lineNumbers: !layout.lineNumbers }) },
        { label: layout.split ? "Join Editors" : "Split Editor", shortcut: "Ctrl+\\", onSelect: () => patchLayout({ split: !layout.split }) },
        { sep: true, label: "" },
        { label: "Appearance: System", onSelect: () => saveThemePref("system") },
        { label: "Appearance: Light", onSelect: () => saveThemePref("light") },
        { label: "Appearance: Dark", onSelect: () => saveThemePref("dark") },
        { label: "Zoom In", onSelect: () => setZoom((z) => Math.min(1.4, z + 0.1)) },
        { label: "Zoom Out", onSelect: () => setZoom((z) => Math.max(0.8, z - 0.1)) },
        { label: "Toggle Full Screen", shortcut: shortcutLabel("toggleFullscreen", os, userKeys), onSelect: () => void document.documentElement.requestFullscreen?.() },
      ],
    },
    {
      id: "go",
      label: "Go",
      items: [
        { label: "Back", shortcut: "Alt+Left", onSelect: () => history.back() },
        { label: "Forward", shortcut: "Alt+Right", onSelect: () => history.forward() },
        { label: "Go to File…", shortcut: shortcutLabel("quickOpen", os, userKeys), onSelect: () => setQuickOpen(true) },
        { label: "Go to Line/Column…", shortcut: "Ctrl+G", onSelect: () => setGoto("") },
        { sep: true, label: "" },
        { label: "requirements.md", onSelect: () => spec && openFile("requirements", "requirements") },
        { label: "design.md", onSelect: () => spec && canOpen("design") && openFile("design", "design") },
        { label: "tasks.md", onSelect: () => spec && canOpen("tasks") && openFile("tasks", "tasks") },
      ],
    },
    {
      id: "run",
      label: "Run",
      items: [
        { label: "Start Debugging", shortcut: "F5", onSelect: () => { setSide("debug"); setOutput("F5 — running tasks"); void runTasks(); } },
        { label: "Run Without Debugging", shortcut: "Ctrl+F5", onSelect: () => void runTasks() },
        { label: "Stop", shortcut: "Shift+F5", onSelect: () => setOutput("Stopped") },
      ],
    },
    {
      id: "terminal",
      label: "Terminal",
      items: [
        { label: "New Terminal", onSelect: () => setShowTerm(true) },
        { label: "Clear Terminal", onSelect: () => store.clearTerm() },
        { label: "Close Terminal", onSelect: () => setShowTerm(false) },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Keyboard Shortcuts", shortcut: shortcutLabel("showShortcuts", os, userKeys), onSelect: () => setShowKeys(true) },
        { label: "About Sutra", onSelect: () => setShowKeys(true) },
      ],
    },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      {layout.menuBar && !layout.zen ? <MenuBar menus={menus} /> : null}
      <div className="flex h-9 items-center gap-2 border-b border-border bg-surface px-2">
        <button type="button" className="px-1 text-subtle" aria-label="Back" onClick={() => history.back()}>
          ←
        </button>
        <button type="button" className="px-1 text-subtle" aria-label="Forward" onClick={() => history.forward()}>
          →
        </button>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="flex h-7 flex-1 items-center justify-center gap-2 rounded-sm bg-raised text-xs text-subtle"
        >
          <span>⌕</span>
          {spec ? spec.name : ws.activeFolder ? ws.activeFolder.split(/[/\\]/).pop() : "Untitled (Workspace)"}
        </button>
        <button
          type="button"
          onClick={() => setShowChat(true)}
          className={cn(
            "h-7 rounded-sm px-2 text-xs",
            showChat ? "bg-raised text-accent" : "text-muted",
          )}
        >
          Agent Focus
        </button>
      </div>
      <div className={cn("flex min-h-0 flex-1", layout.sidebarRight && "flex-row-reverse")}>
        {layout.activityBar && !layout.zen ? (
        <ActivityBar
          side={side}
          chat={showChat}
          scmCount={0}
          onSide={(s) => {
            setSide(s);
            setShowExplorer(true);
            patchLayout({ sidebar: true });
          }}
          onChat={() => setShowChat((v) => !v)}
        />
        ) : null}
        {showExplorer && layout.sidebar && !layout.zen ? (
          <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
            {side === "scm" ? (
              <ScmPanel
                folder={ws.activeFolder}
                onOpen={(rel) => ws.activeFolder && void ws.openDisk(ws.activeFolder, rel)}
              />
            ) : side === "debug" ? (
              <div className="p-3 text-xs text-muted">
                <p className="text-[11px] tracking-widest text-subtle">RUN AND DEBUG</p>
                <button type="button" className="mt-2 h-8 rounded-sm bg-accent px-3 text-accent-fg" onClick={() => void runTasks()}>
                  Start (F5)
                </button>
                <p className="mt-2 text-subtle">Variables, watch, and call stack attach when a debug adapter is configured.</p>
              </div>
            ) : side === "kiro" ? (
              <KiroPanel specName={spec?.name} onOpenSpec={() => spec && openFile("requirements", "requirements")} />
            ) : side === "search" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="px-3 py-2 text-[11px] font-medium tracking-widest text-subtle">SEARCH</p>
                <input
                  className="mx-2 h-8 rounded-sm bg-raised px-2 text-xs outline-none"
                  placeholder="Search files"
                  value={find ?? ""}
                  onChange={(e) => setFind(e.target.value)}
                />
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1">
                  {ws.entries
                    .filter((e) => !e.dir && (!find || e.path.toLowerCase().includes(find.toLowerCase())))
                    .slice(0, 80)
                    .map((e) => (
                      <button
                        key={e.path}
                        type="button"
                        className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-raised"
                        onClick={() => ws.activeFolder && void ws.openDisk(ws.activeFolder, e.path)}
                      >
                        {e.path}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <>
                <p className="px-3 py-2 text-[11px] font-medium tracking-widest text-subtle">EXPLORER</p>
                <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
                  <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                    {ws.activeFolder ? ws.activeFolder.split(/[/\\]/).pop() : spec ? spec.slug : "No folder"}
                  </p>
                  {ws.entries.length ? (
                    <ExplorerTree
                      entries={ws.entries}
                      active={ws.activeDoc?.split("::")[1]}
                      onOpen={(rel) => ws.activeFolder && void ws.openDisk(ws.activeFolder, rel)}
                    />
                  ) : spec ? (
                    <SpecTree
                      file={file}
                      stage={stage}
                      setFile={(f) => openFile(f, fileStage(f, stage))}
                      setStage={setStage}
                      hasCode={stage === "implement"}
                      srcNames={files.map((f) => f.path.split("/").pop() ?? f.path)}
                    />
                  ) : (
                    <p className="px-2 pt-2 text-xs text-subtle">File → Open Folder… to add a project.</p>
                  )}
                </div>
                <div className="border-t border-border px-3 py-2">
                  <p className="text-[11px] font-medium tracking-widest text-subtle">TIMELINE</p>
                  <p className="mt-2 text-xs text-subtle">Local Git history appears after you open a repository.</p>
                </div>
              </>
            )}
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-9 items-center overflow-x-auto border-b border-border">
            {openTabs.length === 0 && ws.docs.length === 0 ? (
              <p className="px-3 text-xs text-subtle">Welcome</p>
            ) : (
              <>
                {ws.docs.map((d) => {
                  const key = `${d.folder}::${d.rel}`;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex h-9 shrink-0 items-center border-r border-border",
                        ws.activeDoc === key ? "bg-raised" : "",
                      )}
                    >
                      <button type="button" onClick={() => void ws.openDisk(d.folder, d.rel)} className="h-9 px-3 font-mono text-xs">
                        {d.rel.split("/").pop()}
                        {d.dirty ? " •" : ""}
                      </button>
                      <button type="button" aria-label={`Close ${d.rel}`} onClick={() => ws.closeDoc(key)} className="h-9 w-7 text-subtle hover:text-fg">
                        <X className="mx-auto size-3.5" />
                      </button>
                    </div>
                  );
                })}
                {openTabs.map((tab) => (
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
              ))}
              </>
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
            {replace !== null ? (
              <div className="flex items-center gap-2 border-b border-border px-3 py-1">
                <input className="h-8 flex-1 bg-transparent text-sm outline-none" placeholder="Replace" value={replace} onChange={(e) => setReplace(e.target.value)} />
                <button type="button" className="text-xs" onClick={() => { if (replace && find) ws.editDoc((ws.docs.find((d) => `${d.folder}::${d.rel}` === ws.activeDoc)?.content ?? "").replaceAll(find, replace)); }}>Replace all</button>
              </div>
            ) : null}
            {goto !== null ? (
              <div className="flex items-center gap-2 border-b border-border px-3 py-1">
                <input
                  autoFocus
                  className="h-8 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Go to line"
                  value={goto}
                  onChange={(e) => setGoto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCursor({ line: Number(goto) || 1, col: 1 });
                      setGoto(null);
                    }
                    if (e.key === "Escape") setGoto(null);
                  }}
                />
              </div>
            ) : null}
            {layout.breadcrumbs && !layout.zen ? (
              <p className="truncate border-b border-border px-3 py-1 text-[11px] text-subtle">
                {ws.activeFolder?.split(/[/\\]/).slice(-2).join(" / ") || "workspace"}
                {ws.activeDoc ? ` / ${ws.activeDoc.split("::")[1]}` : spec ? ` / ${spec.slug}` : ""}
              </p>
            ) : null}
            {ws.activeDoc ? (
              <div className={cn("flex min-h-0 flex-1", layout.split && "gap-px bg-border")}>
                <CodeEditor
                  value={ws.docs.find((d) => `${d.folder}::${d.rel}` === ws.activeDoc)?.content ?? ""}
                  onChange={(v) => ws.editDoc(v)}
                  find={find ?? ""}
                  wrap={layout.wordWrap}
                  lineNumbers={layout.lineNumbers}
                  onCursor={(line, col) => setCursor({ line, col })}
                />
                {layout.split ? (
                  <CodeEditor
                    value={ws.docs.find((d) => `${d.folder}::${d.rel}` === ws.activeDoc)?.content ?? ""}
                    onChange={(v) => ws.editDoc(v)}
                    wrap={layout.wordWrap}
                    lineNumbers={layout.lineNumbers}
                  />
                ) : null}
              </div>
            ) : openTabs.length === 0 && !spec ? (
              <WelcomePane
                onCommand={(label) => {
                  if (label === "Open chat") setShowChat(true);
                  if (label === "Show All Commands") setPalette(true);
                  if (label === "Go to File") setQuickOpen(true);
                  if (label === "Find in Files") {
                    setSide("search");
                    setShowExplorer(true);
                  }
                  if (label === "Start Debugging") void runTasks();
                  if (label === "Toggle Terminal") setShowTerm((v) => !v);
                  if (label === "Show Settings") window.location.href = "/settings";
                  if (label === "Toggle Full Screen") void document.documentElement.requestFullscreen?.();
                  if (label === "Open Folder") void ws.openFolder();
                }}
              />
            ) : (
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
            )}
          </div>
          {(showTerm || layout.panel) && !layout.zen ? (
            <BottomPanel
              tab={layout.panelTab}
              onTab={(t) => patchLayout({ panelTab: t, panel: true })}
              onClose={() => {
                patchLayout({ panel: false });
                setShowTerm(false);
              }}
              problems={
                ws.activeFolder
                  ? []
                  : [{ file: "workspace", message: "No folder opened", severity: "warning" as const }]
              }
              output={output}
            />
          ) : null}
        </section>

        {showChat && !layout.zen ? (
          <aside className="flex w-[22rem] shrink-0 flex-col border-l border-border lg:w-[24rem]">
            <div className="flex h-9 items-center border-b border-border">
              <p className="px-3 text-xs text-fg">New Session</p>
              <span className="flex-1" />
              <button type="button" onClick={() => newChatTab()} className="h-9 w-8 text-muted" aria-label="New session">
                +
              </button>
            </div>
            <div className="max-h-24 overflow-hidden border-b border-border">
              <ChatSidebar />
            </div>
            <ChatThread folder={ws.activeFolder} />
          </aside>
        ) : null}
      </div>
      {layout.statusBar && !layout.zen ? (
        <StatusBar
          os={os === "macos" ? "macOS" : "Windows"}
          branch={undefined}
          errors={0}
          warnings={ws.activeFolder ? 0 : 1}
          line={cursor.line}
          col={cursor.col}
          language={ws.activeDoc?.split(".").pop() ?? spec?.stack ?? "plaintext"}
          notice={ws.notice ?? (saved ? "Saved" : null)}
          onProblems={() => patchLayout({ panel: true, panelTab: "problems" })}
          onScm={() => {
            setSide("scm");
            patchLayout({ sidebar: true });
          }}
        />
      ) : null}
      {showKeys ? <ShortcutsHelp os={os} onClose={() => setShowKeys(false)} /> : null}
      {ws.folderMode ? (
        <OpenFolderDialog
          title={ws.folderMode === "add" ? "Add Folder to Workspace" : "Open Folder"}
          home={ws.home}
          onCancel={() => ws.setFolderMode(null)}
          onPick={(folder, create) => void ws.attachFolder(folder, create)}
        />
      ) : null}
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
              save: () => {
        void ws.saveDoc().then((ok) => {
          if (ok) setSaved(true);
        });
      },
              find: () => setFind(""),
              findInFiles: () => setPalette(true),
              showSettings: () => {
                window.location.href = "/settings";
              },
              toggleFullscreen: () => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen();
              },
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
