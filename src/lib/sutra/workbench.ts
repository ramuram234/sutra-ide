const KEY = "sutra.workbench";

export type PanelTab = "problems" | "output" | "debug" | "terminal" | "ports";
export type SideView = "explorer" | "search" | "scm" | "debug" | "kiro" | "chat";

export type WorkbenchLayout = {
  menuBar: boolean;
  activityBar: boolean;
  statusBar: boolean;
  breadcrumbs: boolean;
  sidebar: boolean;
  sidebarRight: boolean;
  panel: boolean;
  panelTab: PanelTab;
  zen: boolean;
  wordWrap: boolean;
  minimap: boolean;
  split: boolean;
  lineNumbers: boolean;
};

export const DEFAULT_LAYOUT: WorkbenchLayout = {
  menuBar: true,
  activityBar: true,
  statusBar: true,
  breadcrumbs: true,
  sidebar: true,
  sidebarRight: false,
  panel: true,
  panelTab: "terminal",
  zen: false,
  wordWrap: true,
  minimap: false,
  split: false,
  lineNumbers: true,
};

export function loadLayout(): WorkbenchLayout {
  try {
    return { ...DEFAULT_LAYOUT, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<WorkbenchLayout>) };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: WorkbenchLayout) {
  localStorage.setItem(KEY, JSON.stringify(layout));
}
