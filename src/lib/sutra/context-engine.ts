/**
 * Context engine: retrieve a few relevant files. Never dump the repo into the model.
 */
import { detectFrameworkHints, detectProject, formatFacts, type ProjectFacts } from "./discovery";
import { listFolder, readWorkspaceFile } from "./workspace-io";

export type Retrieved = { path: string; excerpt: string; score: number };
export type ObserveResult = {
  facts: ProjectFacts;
  files: string[];
  retrieved: Retrieved[];
  summary: string;
};

function terms(q: string) {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that", "from", "code", "write"].includes(w));
}

export async function observeWorkspace(folder: string, prompt: string): Promise<ObserveResult> {
  const listed = await listFolder({ data: { folder } });
  const files = listed.entries.filter((e) => !e.dir).map((e) => e.path);
  const facts = detectProject(files);
  const q = terms(prompt);
  const scored: Retrieved[] = [];

  const manifests = files.filter((f) =>
    /(package\.json|pom\.xml|build\.gradle|go\.mod|pyproject\.toml|cargo\.toml|composer\.json)$/i.test(f),
  );
  for (const rel of manifests.slice(0, 6)) {
    try {
      const raw = await readWorkspaceFile({ data: { folder, rel } });
      detectFrameworkHints(rel, raw.content, facts);
      scored.push({ path: rel, excerpt: raw.content.slice(0, 800), score: 8 });
    } catch {
      /* skip */
    }
  }

  for (const rel of files) {
    const low = rel.toLowerCase();
    let score = q.reduce((n, t) => n + (low.includes(t) ? 5 : 0), 0);
    if (!score) continue;
    try {
      const raw = await readWorkspaceFile({ data: { folder, rel } });
      const body = raw.content.toLowerCase();
      score += q.reduce((n, t) => n + (body.includes(t) ? 2 : 0), 0);
      scored.push({ path: rel, excerpt: raw.content.slice(0, 1200), score });
    } catch {
      scored.push({ path: rel, excerpt: "", score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const retrieved: Retrieved[] = [];
  const seen = new Set<string>();
  for (const r of scored) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    retrieved.push(r);
    if (retrieved.length >= 12) break;
  }

  const summary = [
    formatFacts(facts),
    `files indexed: ${files.length}`,
    retrieved.length
      ? `retrieved for this request:\n${retrieved.map((r) => `- ${r.path}`).join("\n")}`
      : "no lexical hits — agent must glob/grep",
  ].join("\n");

  return { facts, files: files.slice(0, 200), retrieved, summary };
}
