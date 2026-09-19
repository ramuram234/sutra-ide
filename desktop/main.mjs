import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SUTRA_PORT ?? 7310);
const URL = process.env.SUTRA_URL ?? `http://127.0.0.1:${PORT}/`;

let child = null;

function waitForServer(url, tries = 80) {
  return new Promise((resolve, reject) => {
    const tick = (n) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (n <= 0) reject(new Error("Sutra server did not start. Rebuild with npm run dist:win / dist:mac."));
        else setTimeout(() => tick(n - 1), 250);
      });
    };
    tick(tries);
  });
}

function startServer() {
  if (process.env.SUTRA_URL) return Promise.resolve();
  const appRoot = path.resolve(__dirname, "..");
  const entry = path.join(__dirname, "server-entry.mjs");
  child = spawn(process.execPath, [entry], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      SUTRA_PORT: String(PORT),
      SUTRA_WORKSPACE: process.env.SUTRA_WORKSPACE || path.join(app.getPath("home"), "Sutra", "workspace"),
    },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) console.error("Sutra server exited", code);
  });
  return waitForServer(URL);
}

ipcMain.on("sutra-theme", (_e, source) => {
  nativeTheme.themeSource = source === "light" || source === "dark" ? source : "system";
});

async function createWindow() {
  const dark = nativeTheme.shouldUseDarkColors;
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Sutra",
    backgroundColor: dark ? "#1a1a22" : "#f3f3f6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  try {
    await startServer();
    await win.loadURL(URL);
  } catch (err) {
    dialog.showErrorBox("Sutra", String(err?.message ?? err));
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (child) child.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
