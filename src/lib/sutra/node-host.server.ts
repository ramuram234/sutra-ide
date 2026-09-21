/** Server-only Node host. Never import this from client components — Vite stubs it. */
import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function nodeHost() {
  return { execFile: execFileAsync, spawn, fs, os, path };
}
