export type SutraDesktop = {
  platform: string;
  openFolder: () => Promise<string | null>;
  openFiles: () => Promise<string[]>;
  saveAs: (name: string) => Promise<string | null>;
  newWindow: () => Promise<void>;
  quit: () => Promise<void>;
  setNativeTheme?: (source: string) => void;
};

declare global {
  interface Window {
    sutraDesktop?: SutraDesktop;
  }
}

export function isDesktop() {
  return Boolean(typeof window !== "undefined" && window.sutraDesktop);
}

export async function pickFolder() {
  return window.sutraDesktop?.openFolder() ?? null;
}

export async function pickFiles() {
  return window.sutraDesktop?.openFiles() ?? [];
}

export async function pickSaveAs(name: string) {
  return window.sutraDesktop?.saveAs(name) ?? null;
}

export async function newDesktopWindow() {
  await window.sutraDesktop?.newWindow();
}

export async function quitDesktop() {
  await window.sutraDesktop?.quit();
}
