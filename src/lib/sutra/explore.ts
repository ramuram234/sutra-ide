/**
 * Explorer agent context — not the IDE. Reads workspace folders, files,
 * Spring/JPA entities and columns, then returns a briefing the other
 * agents consume. Same first step as Kiro / Copilot workspace agents.
 */
import { createServerFn } from "@tanstack/react-start";
import { matchColumns, parseJavaEntity, queryTerms, type FoundEntity } from "./explore-parse";
import { listFolder, readWorkspaceFile, workspaceInfo } from "./workspace-io";

export type { EntityColumn, FoundEntity } from "./explore-parse";
export type RelatedHit = { path: string; why: string };
export type WorkspaceBrief = {
  folders: string[];
  files: string[];
  stack: string[];
  entities: FoundEntity[];
  related: RelatedHit[];
  summary: string;
};

export { matchColumns, queryTerms };

function detectStacks(files: string[]) {
  const s = new Set<string>();
  if (files.some((f) => /(^|\/)pom\.xml$|(^|\/)build\.gradle/.test(f))) s.add("java-spring");
  if (files.some((f) => f.endsWith(".java"))) s.add("java");
  if (files.some((f) => /(^|\/)package\.json$/.test(f))) s.add("node");
  if (files.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"))) s.add("react");
  if (files.some((f) => f.endsWith(".py"))) s.add("python");
  if (files.some((f) => f.endsWith(".cs"))) s.add("csharp");
  return [...s];
}

export async function scanWorkspace(folder: string, prompt: string): Promise<WorkspaceBrief> {
  const listed = await listFolder({ data: { folder } });
  const files = listed.entries.filter((e) => !e.dir).map((e) => e.path);
  const terms = queryTerms(prompt);
  const entities: FoundEntity[] = [];
  const related: RelatedHit[] = [];

  const javaFiles = files.filter((f) => f.endsWith(".java"));
  for (const rel of javaFiles.slice(0, 80)) {
    try {
      const raw = await readWorkspaceFile({ data: { folder, rel } });
      const ent = parseJavaEntity(rel, raw.content);
      if (ent) entities.push(ent);
      const hitTerm = terms.find((t) => rel.toLowerCase().includes(t) || raw.content.toLowerCase().includes(t));
      if (hitTerm) related.push({ path: rel, why: `mentions "${hitTerm}"` });
    } catch {
      /* skip unreadable */
    }
  }

  for (const rel of files) {
    const low = rel.toLowerCase();
    if (javaFiles.includes(rel)) continue;
    const hitTerm = terms.find((t) => low.includes(t));
    if (hitTerm) related.push({ path: rel, why: `filename "${hitTerm}"` });
  }

  const stack = detectStacks(files);
  const uniqueRelated = related.filter((r, i, a) => a.findIndex((x) => x.path === r.path) === i).slice(0, 24);
  const lines = [
    `Folder: ${folder}`,
    `Files: ${files.length}. Stack: ${stack.join(", ") || "unknown"}.`,
    entities.length
      ? `JPA entities:\n${entities
          .map((e) => `  ${e.className} table=${e.table} (${e.file})\n    columns: ${e.columns.map((c) => `${c.field}:${c.javaType}`).join(", ")}`)
          .join("\n")}`
      : "No @Entity Java classes found.",
    uniqueRelated.length ? `Related to prompt:\n${uniqueRelated.map((r) => `  ${r.path} — ${r.why}`).join("\n")}` : "No filename/content hits for the prompt yet.",
  ];
  return {
    folders: [folder],
    files: files.slice(0, 200),
    stack,
    entities,
    related: uniqueRelated,
    summary: lines.join("\n"),
  };
}

export const exploreWorkspace = createServerFn({ method: "POST" })
  .validator((input: { folder?: string | null; prompt: string }) => ({
    folder: input.folder ?? null,
    prompt: input.prompt.trim().slice(0, 2000),
  }))
  .handler(async ({ data }): Promise<WorkspaceBrief> => {
    const info = await workspaceInfo();
    const roots = data.folder ? [data.folder] : info.folders;
    const merged: WorkspaceBrief = {
      folders: [],
      files: [],
      stack: [],
      entities: [],
      related: [],
      summary: "",
    };
    for (const root of roots) {
      try {
        const one = await scanWorkspace(root, data.prompt);
        merged.folders.push(...one.folders);
        merged.files.push(...one.files.map((f) => `${root} :: ${f}`));
        merged.stack.push(...one.stack);
        merged.entities.push(...one.entities);
        merged.related.push(...one.related);
      } catch (err) {
        merged.summary += `Could not scan ${root}: ${err instanceof Error ? err.message : "error"}\n`;
      }
    }
    merged.stack = [...new Set(merged.stack)];
    merged.summary =
      `Workspace folders:\n${merged.folders.map((f) => `  ${f}`).join("\n") || "  (none open)"}\n\n` +
      (merged.entities.length
        ? merged.entities
            .map((e) => `${e.className} / ${e.table} @ ${e.file}\n  ${e.columns.map((c) => c.field).join(", ")}`)
            .join("\n")
        : "No JPA entities.") +
      `\n\n${merged.summary}`;
    return merged;
  });

export function pickEntityForPrompt(brief: WorkspaceBrief, prompt: string) {
  const terms = queryTerms(prompt);
  const scored = brief.entities.map((e) => {
    const blob = `${e.className} ${e.table} ${e.file} ${e.columns.map((c) => c.field).join(" ")}`.toLowerCase();
    return { e, n: terms.filter((t) => blob.includes(t)).length };
  });
  scored.sort((a, b) => b.n - a.n);
  return scored[0]?.n ? scored[0].e : brief.entities[0] ?? null;
}
