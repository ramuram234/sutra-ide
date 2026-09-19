/**
 * Language Server Protocol host (same JSON-RPC stdio as VS Code).
 * Spawn from Electron: node lsp-host.mjs typescript
 * Then pipe editor didOpen/completion/hover to the child.
 */
import { spawn } from "node:child_process";

const LAUNCH = {
  typescript: ["typescript-language-server", ["--stdio"]],
  javascript: ["typescript-language-server", ["--stdio"]],
  python: ["pylsp", []],
  java: ["jdtls", []],
  go: ["gopls", []],
  rust: ["rust-analyzer", []],
};

const lang = process.argv[2] || "typescript";
const spec = LAUNCH[lang];
if (!spec) {
  console.error("Unknown language", lang);
  process.exit(1);
}
const child = spawn(spec[0], spec[1], { stdio: ["pipe", "pipe", "inherit"] });
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.on("exit", (c) => process.exit(c ?? 0));
