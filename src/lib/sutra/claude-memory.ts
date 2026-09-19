import { createServerFn } from "@tanstack/react-start";
import { listFolder, readWorkspaceFile, writeWorkspaceFile } from "./workspace-io";

export const initSutraMd = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    const listed = await listFolder({ data: { folder: data.folder } });
    const files = listed.entries.filter((e) => !e.dir).map((e) => e.path);
    let pkg = "";
    if (files.includes("package.json")) {
      try {
        pkg = (await readWorkspaceFile({ data: { folder: data.folder, rel: "package.json" } })).content.slice(0, 1500);
      } catch {
        pkg = "";
      }
    }
    const body = `# SUTRA.md

Project memory for Sutra Code (same role as Claude Code CLAUDE.md). Loaded every agent turn.

## Layout
${files.slice(0, 40).map((f) => `- ${f}`).join("\n") || "- (empty folder)"}

## Build
${pkg.includes("\"scripts\"") ? "See package.json scripts." : "Add test and build commands here."}

## Conventions
- Prefer small diffs (edit exact strings).
- Do not commit secrets.
- Ask before destructive git.

${pkg ? `## package.json (excerpt)\n\`\`\`json\n${pkg.slice(0, 800)}\n\`\`\`\n` : ""}
`;
    await writeWorkspaceFile({ data: { folder: data.folder, rel: "SUTRA.md", content: body } });
    return { ok: true as const, path: "SUTRA.md" };
  });

export const listSkills = createServerFn({ method: "POST" })
  .validator((input: { folder: string }) => ({ folder: input.folder }))
  .handler(async ({ data }) => {
    const listed = await listFolder({ data: { folder: data.folder } });
    return listed.entries
      .filter((e) => /\/SKILL\.md$/i.test(e.path) || /(^|\/)\.sutra\/skills\//.test(e.path))
      .map((e) => e.path);
  });

export const rewindFile = createServerFn({ method: "POST" })
  .validator((input: { folder: string; rel: string }) => ({ folder: input.folder, rel: input.rel }))
  .handler(async ({ data }) => {
    const bak = `.sutra/checkpoints/${data.rel.replaceAll("/", "__")}.bak`;
    const prev = await readWorkspaceFile({ data: { folder: data.folder, rel: bak } });
    await writeWorkspaceFile({ data: { folder: data.folder, rel: data.rel, content: prev.content } });
    return { ok: true as const, restored: data.rel };
  });
