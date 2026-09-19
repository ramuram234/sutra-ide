import { useCallback, useEffect, useState } from "react";
import {
  listFolder,
  readWorkspaceFile,
  registerFolder,
  workspaceInfo,
  writeWorkspaceFile,
  type DirEntry,
} from "@/lib/sutra/workspace-io";
import { isDesktop, newDesktopWindow, pickFiles, pickFolder, pickSaveAs, quitDesktop } from "@/lib/sutra/desktop";

export type DiskDoc = { folder: string; rel: string; content: string; dirty: boolean };

export function useWorkspace() {
  const [home, setHome] = useState("~/Sutra/workspace");
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [docs, setDocs] = useState<DiskDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [folderMode, setFolderMode] = useState<"open" | "add" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async (folder: string) => {
    const listed = await listFolder({ data: { folder } });
    setEntries(listed.entries);
    setActiveFolder(listed.folder);
  }, []);

  useEffect(() => {
    void workspaceInfo().then((info) => {
      setHome(info.home);
      setFolders(info.folders);
      const first = info.folders[0] ?? info.home;
      if (first) void refresh(first).catch(() => undefined);
    });
  }, [refresh]);

  async function attachFolder(folder: string, create: boolean) {
    const r = await registerFolder({ data: { folder, create } });
    setFolders(r.folders);
    await refresh(r.folder);
    setFolderMode(null);
    setNotice(`Opened ${r.folder}`);
  }

  async function openFolder() {
    const picked = await pickFolder();
    if (picked) await attachFolder(picked, false);
    else setFolderMode("open");
  }

  async function addFolder() {
    const picked = await pickFolder();
    if (picked) await attachFolder(picked, false);
    else setFolderMode("add");
  }

  async function openFileDialog() {
    const picked = await pickFiles();
    if (!picked.length) return;
    const folder = activeFolder ?? home;
    for (const abs of picked) {
      const rel = abs.replaceAll("\\", "/").split("/").pop() ?? "file";
      try {
        const file = await readWorkspaceFile({ data: { folder, rel } });
        await openDisk(folder, file.path);
      } catch {
        setNotice(`Open that file from a workspace folder: ${rel}`);
      }
    }
  }

  async function openDisk(folder: string, rel: string) {
    const key = `${folder}::${rel}`;
    const existing = docs.find((d) => `${d.folder}::${d.rel}` === key);
    if (existing) {
      setActiveDoc(key);
      return;
    }
    const file = await readWorkspaceFile({ data: { folder, rel } });
    setDocs((d) => [...d, { folder, rel: file.path, content: file.content, dirty: false }]);
    setActiveDoc(`${folder}::${file.path}`);
  }

  async function newFile() {
    const folder = activeFolder ?? home;
    const rel = `untitled-${Date.now().toString(36)}.txt`;
    await writeWorkspaceFile({ data: { folder, rel, content: "" } });
    await refresh(folder);
    setDocs((d) => [...d, { folder, rel, content: "", dirty: true }]);
    setActiveDoc(`${folder}::${rel}`);
  }

  function editDoc(content: string) {
    if (!activeDoc) return;
    setDocs((d) => d.map((x) => (`${x.folder}::${x.rel}` === activeDoc ? { ...x, content, dirty: true } : x)));
  }

  async function saveDoc() {
    const doc = docs.find((d) => `${d.folder}::${d.rel}` === activeDoc);
    if (!doc) return false;
    await writeWorkspaceFile({ data: { folder: doc.folder, rel: doc.rel, content: doc.content } });
    setDocs((d) => d.map((x) => (x === doc ? { ...x, dirty: false } : x)));
    setNotice(`Saved ${doc.rel}`);
    return true;
  }

  async function saveDocAs() {
    const doc = docs.find((d) => `${d.folder}::${d.rel}` === activeDoc);
    const name = await pickSaveAs(doc?.rel ?? "untitled.txt");
    if (!name || !doc) return;
    const rel = name.replaceAll("\\", "/").split("/").pop() ?? doc.rel;
    await writeWorkspaceFile({ data: { folder: doc.folder, rel, content: doc.content } });
    await refresh(doc.folder);
    setNotice(`Saved ${rel}`);
  }

  function closeDoc(key: string) {
    setDocs((d) => d.filter((x) => `${x.folder}::${x.rel}` !== key));
    setActiveDoc((cur) => (cur === key ? null : cur));
  }

  async function closeFolder() {
    setEntries([]);
    setActiveFolder(null);
    setDocs([]);
    setActiveDoc(null);
  }

  return {
    home,
    folders,
    activeFolder,
    entries,
    docs,
    activeDoc,
    folderMode,
    setFolderMode,
    notice,
    attachFolder,
    openFolder,
    addFolder,
    openFileDialog,
    openDisk,
    newFile,
    editDoc,
    saveDoc,
    saveDocAs,
    closeDoc,
    closeFolder,
    isDesktop: isDesktop(),
    newWindow: newDesktopWindow,
    quit: quitDesktop,
  };
}
