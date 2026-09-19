import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { preview } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.SUTRA_PORT ?? 7310);

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv(path.join(homedir(), ".sutra", ".env"));
loadDotEnv(path.join(root, ".env"));

const server = await preview({
  root,
  preview: { host: "127.0.0.1", port, strictPort: false },
});
const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
process.stdout.write(`Sutra desktop server ${url}\n`);
