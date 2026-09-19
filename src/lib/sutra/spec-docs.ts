import type { ModuleSpec } from "./schema";
import { stackLabel } from "./codegen";
import { DEFAULT_RULES, KIRO_INVARIANTS, rulesToYaml, type PermissionRule } from "./permissions";

export function permissionsYaml(extra: PermissionRule[]) {
  return `# .sutra/permissions.yaml
# deny > ask > allow. Kiro-style capability rules.
# User rules persist in this browser. Workspace rules are per project slug.

${rulesToYaml([...KIRO_INVARIANTS, ...DEFAULT_RULES, ...extra])}`;
}

export function requirementsMd(spec: ModuleSpec) {
  const lines = spec.requirements.map(
    (r) => `### ${r.id}\n\nTHE SYSTEM SHALL: ${r.ears}`,
  );
  return `# requirements.md — ${spec.name}

${spec.summary}

## User stories (EARS)

${lines.join("\n\n")}
`;
}

export function designMd(spec: ModuleSpec) {
  const entities = spec.entities
    .map((e) => {
      const fields = e.fields
        .map((f) => `- \`${f.name}\` (${f.type}${f.required ? ", required" : ""}) — ${f.label}`)
        .join("\n");
      return `### ${e.name}\n${fields || "- (fields on screens)"}`;
    })
    .join("\n\n");
  const apis = spec.apis
    .map(
      (a) =>
        `- \`${a.method} ${a.path}\` (${a.role}) — ${a.purpose}\n  - in: ${a.request || "—"}\n  - out: ${a.response || "—"}`,
    )
    .join("\n");
  const screens = spec.screens
    .map((s) => `- **${s.name}** (\`${s.type}\`) — ${s.description}`)
    .join("\n");
  return `# design.md — ${spec.name}

Stack: **${stackLabel(spec.stack)}**

Stack: React UI + Node/Express REST. Module: ${spec.module}. Slug: \`${spec.slug}\`.

## Data model

${entities || "Derived from screens."}

## API contract

${apis}

## Screens

${screens}
`;
}

export function tasksMd(spec: ModuleSpec) {
  const items = spec.tasks
    .map((t) => `- [ ] ${t.id} (${t.owner}) ${t.title}`)
    .join("\n");
  return `# tasks.md — ${spec.name}

Run in order. Do not skip the checkpoint.

${items || "- [ ] T1 (ui) Render screens from spec\n- [ ] T2 (api) Express routes\n- [ ] T3 (data) In-memory store for preview"}
`;
}
