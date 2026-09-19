import type { IdeAction } from "./keymap";

export type SutraCommand = {
  id: string;
  label: string;
  category: "File" | "Edit" | "Selection" | "View" | "Go" | "Run" | "Terminal" | "AI" | "Preferences";
  mapsTo?: IdeAction;
};

/** VS Code-style command registry. Palette searches this list. */
export const COMMANDS: SutraCommand[] = [
  { id: "workbench.action.showCommands", label: "Command Palette", category: "View", mapsTo: "commandPalette" },
  { id: "workbench.action.quickOpen", label: "Go to File…", category: "Go", mapsTo: "quickOpen" },
  { id: "workbench.action.openSettings", label: "Open Settings", category: "Preferences", mapsTo: "showSettings" },
  { id: "workbench.action.openGlobalKeybindings", label: "Open Keyboard Shortcuts", category: "Preferences", mapsTo: "showKeybindings" },
  { id: "workbench.action.toggleFullScreen", label: "Toggle Full Screen", category: "View", mapsTo: "toggleFullscreen" },
  { id: "workbench.action.toggleSidebarVisibility", label: "Toggle Primary Side Bar", category: "View", mapsTo: "toggleExplorer" },
  { id: "workbench.action.togglePanel", label: "Toggle Panel", category: "View", mapsTo: "toggleTerminal" },
  { id: "workbench.action.chat.open", label: "Open Agent Focus", category: "AI", mapsTo: "toggleChat" },
  { id: "workbench.action.files.save", label: "Save", category: "File", mapsTo: "save" },
  { id: "workbench.action.closeActiveEditor", label: "Close Editor", category: "File", mapsTo: "closeEditor" },
  { id: "actions.find", label: "Find", category: "Edit", mapsTo: "find" },
  { id: "workbench.action.findInFiles", label: "Find in Files", category: "Edit", mapsTo: "findInFiles" },
  { id: "workbench.action.debug.start", label: "Start Debugging", category: "Run", mapsTo: "runTasks" },
  { id: "sutra.chat.new", label: "New Chat", category: "AI", mapsTo: "newChat" },

  { id: "explorer.newFile", label: "New File", category: "File" },
  { id: "explorer.newFolder", label: "New Folder", category: "File" },
  { id: "workbench.action.files.openFile", label: "Open File…", category: "File" },
  { id: "workbench.action.files.openFolder", label: "Open Folder…", category: "File" },
  { id: "workbench.action.addRootFolder", label: "Add Folder to Workspace…", category: "File" },
  { id: "workbench.action.files.saveAs", label: "Save As…", category: "File" },
  { id: "workbench.action.files.saveAll", label: "Save All", category: "File" },
  { id: "workbench.action.closeFolder", label: "Close Folder", category: "File" },
  { id: "workbench.action.quit", label: "Exit", category: "File" },

  { id: "undo", label: "Undo", category: "Edit" },
  { id: "redo", label: "Redo", category: "Edit" },
  { id: "editor.action.clipboardCutAction", label: "Cut", category: "Edit" },
  { id: "editor.action.clipboardCopyAction", label: "Copy", category: "Edit" },
  { id: "editor.action.clipboardPasteAction", label: "Paste", category: "Edit" },
  { id: "editor.action.startFindReplaceAction", label: "Replace", category: "Edit" },
  { id: "editor.action.formatDocument", label: "Format Document", category: "Edit" },
  { id: "editor.action.commentLine", label: "Toggle Line Comment", category: "Edit" },
  { id: "editor.action.blockComment", label: "Toggle Block Comment", category: "Edit" },
  { id: "editor.action.indentLines", label: "Indent Line", category: "Edit" },
  { id: "editor.action.outdentLines", label: "Outdent Line", category: "Edit" },
  { id: "editor.action.insertSnippet", label: "Insert Snippet", category: "Edit" },

  { id: "editor.action.selectAll", label: "Select All", category: "Selection" },
  { id: "editor.action.smartSelect.expand", label: "Expand Selection", category: "Selection" },
  { id: "editor.action.smartSelect.shrink", label: "Shrink Selection", category: "Selection" },
  { id: "editor.action.addSelectionToNextFindMatch", label: "Add Selection To Next Find Match", category: "Selection" },
  { id: "editor.action.insertCursorAbove", label: "Add Cursor Above", category: "Selection" },
  { id: "editor.action.insertCursorBelow", label: "Add Cursor Below", category: "Selection" },
  { id: "editor.action.copyLinesUpAction", label: "Copy Line Up", category: "Selection" },
  { id: "editor.action.copyLinesDownAction", label: "Copy Line Down", category: "Selection" },
  { id: "editor.action.moveLinesUpAction", label: "Move Line Up", category: "Selection" },
  { id: "editor.action.moveLinesDownAction", label: "Move Line Down", category: "Selection" },

  { id: "workbench.view.explorer", label: "Show Explorer", category: "View" },
  { id: "workbench.view.search", label: "Show Search", category: "View" },
  { id: "workbench.view.scm", label: "Show Source Control", category: "View" },
  { id: "workbench.view.debug", label: "Show Run and Debug", category: "View" },
  { id: "workbench.view.extensions", label: "Show Extensions", category: "View" },
  { id: "workbench.view.kiro", label: "Show Kiro", category: "View" },
  { id: "workbench.actions.view.problems", label: "Problems", category: "View" },
  { id: "workbench.action.output.toggleOutput", label: "Output", category: "View" },
  { id: "workbench.debug.action.toggleRepl", label: "Debug Console", category: "View" },
  { id: "workbench.action.terminal.toggleTerminal", label: "Toggle Terminal", category: "Terminal" },
  { id: "workbench.action.toggleZenMode", label: "Toggle Zen Mode", category: "View" },
  { id: "workbench.action.toggleWordWrap", label: "Toggle Word Wrap", category: "View" },
  { id: "editor.action.toggleMinimap", label: "Toggle Minimap", category: "View" },
  { id: "workbench.action.splitEditor", label: "Split Editor", category: "View" },
  { id: "workbench.action.toggleBreadcrumbs", label: "Toggle Breadcrumbs", category: "View" },
  { id: "workbench.action.toggleActivityBarVisibility", label: "Toggle Activity Bar", category: "View" },
  { id: "workbench.action.toggleStatusbarVisibility", label: "Toggle Status Bar", category: "View" },
  { id: "workbench.action.movePrimarySidebarRight", label: "Move Primary Side Bar Right", category: "View" },
  { id: "workbench.action.zoomIn", label: "Zoom In", category: "View" },
  { id: "workbench.action.zoomOut", label: "Zoom Out", category: "View" },
  { id: "workbench.action.zoomReset", label: "Reset Zoom", category: "View" },

  { id: "workbench.action.navigateBack", label: "Back", category: "Go" },
  { id: "workbench.action.navigateForward", label: "Forward", category: "Go" },
  { id: "workbench.action.gotoLine", label: "Go to Line/Column…", category: "Go" },
  { id: "editor.action.revealDefinition", label: "Go to Definition", category: "Go" },
  { id: "editor.action.goToTypeDefinition", label: "Go to Type Definition", category: "Go" },
  { id: "editor.action.goToImplementation", label: "Go to Implementation", category: "Go" },
  { id: "editor.action.goToReferences", label: "Go to References", category: "Go" },
  { id: "editor.action.marker.next", label: "Go to Next Problem", category: "Go" },
  { id: "editor.action.marker.prev", label: "Go to Previous Problem", category: "Go" },
  { id: "workbench.action.gotoSymbol", label: "Go to Symbol in Editor…", category: "Go" },
  { id: "workbench.action.showAllSymbols", label: "Go to Symbol in Workspace…", category: "Go" },

  { id: "workbench.action.debug.run", label: "Run Without Debugging", category: "Run" },
  { id: "workbench.action.debug.stop", label: "Stop Debugging", category: "Run" },
  { id: "workbench.action.debug.restart", label: "Restart Debugging", category: "Run" },
  { id: "editor.debug.action.toggleBreakpoint", label: "Toggle Breakpoint", category: "Run" },
  { id: "workbench.debug.viewlet.action.addWatch", label: "Add to Watch", category: "Run" },
  { id: "workbench.action.debug.stepOver", label: "Step Over", category: "Run" },
  { id: "workbench.action.debug.stepInto", label: "Step Into", category: "Run" },
  { id: "workbench.action.debug.stepOut", label: "Step Out", category: "Run" },
  { id: "workbench.action.debug.continue", label: "Continue", category: "Run" },

  { id: "workbench.action.terminal.new", label: "New Terminal", category: "Terminal" },
  { id: "workbench.action.terminal.kill", label: "Kill Terminal", category: "Terminal" },
  { id: "workbench.action.terminal.clear", label: "Clear Terminal", category: "Terminal" },
  { id: "workbench.action.terminal.split", label: "Split Terminal", category: "Terminal" },

  { id: "sutra.agent.plan", label: "Sutra: Plan Mode", category: "AI" },
  { id: "sutra.agent.manual", label: "Sutra: Manual Mode", category: "AI" },
  { id: "sutra.agent.acceptEdits", label: "Sutra: Accept Edits", category: "AI" },
  { id: "sutra.agent.auto", label: "Sutra: Auto Mode", category: "AI" },
  { id: "sutra.spec.generate", label: "Sutra: Generate Spec", category: "AI" },

  { id: "editor.action.triggerSuggest", label: "Trigger Suggest (IntelliSense)", category: "Edit" },
  { id: "editor.action.triggerParameterHints", label: "Trigger Parameter Hints", category: "Edit" },
  { id: "editor.action.rename", label: "Rename Symbol", category: "Edit" },
  { id: "editor.action.quickFix", label: "Quick Fix…", category: "Edit" },
  { id: "editor.action.sourceAction", label: "Source Action…", category: "Edit" },
  { id: "editor.action.organizeImports", label: "Organize Imports", category: "Edit" },
];

export function searchCommands(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return COMMANDS.slice(0, 40);
  return COMMANDS.filter((c) => c.label.toLowerCase().includes(t) || c.id.toLowerCase().includes(t) || c.category.toLowerCase().includes(t)).slice(0, 50);
}
