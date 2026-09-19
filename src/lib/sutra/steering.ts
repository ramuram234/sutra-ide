/**
 * Steering — persistent project rules (.ai/steering, .sutra, SUTRA.md).
 * Advisory only. Hooks/permissions still enforce.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { listFolder, readWorkspaceFile } from "./workspace-io";

const ROOT_NAMES = ["SUTRA.md", "AGENTS.md", "CLAUDE.md", ".ai/steering.md"];

export async function loadSteering(folder: string) {
  const bits: string[] = [];
  for (const name of ROOT_NAMES) {
    try {
      bits.push(`# ${name}\n${(await readFile(path.join(folder, name), "utf8")).slice(0, 4000)}`);
    } catch {
      /* missing */
    }
  }
  try {
    const listed = await listFolder({ data: { folder } });
    const extra = listed.entries.filter(
      (e) => !e.dir && /(\.ai\/steering\/|\.sutra\/steering\/).+\.md$/i.test(e.path),
    );
    for (const f of extra.slice(0, 8)) {
      try {
        const raw = await readWorkspaceFile({ data: { folder, rel: f.path } });
        bits.push(`# ${f.path}\n${raw.content.slice(0, 3000)}`);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return bits.join("\n\n");
}
