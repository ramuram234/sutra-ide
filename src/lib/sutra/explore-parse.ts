export type EntityColumn = { field: string; javaType: string; column: string };
export type FoundEntity = { className: string; table: string; file: string; columns: EntityColumn[] };

const QUERY_STOP = new Set(["write", "code", "for", "the", "and", "with", "from", "this", "that", "screen", "filter", "create", "build"]);

export function queryTerms(prompt: string) {
  return prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !QUERY_STOP.has(w));
}

export function parseJavaEntity(rel: string, src: string): FoundEntity | null {
  if (!/@Entity\b/.test(src)) return null;
  const classMatch = src.match(/class\s+(\w+)/);
  if (!classMatch) return null;
  const table = src.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/)?.[1] ?? classMatch[1];
  const columns: EntityColumn[] = [];
  const fieldRe =
    /(?:@Column\s*\(\s*name\s*=\s*"([^"]+)"[^)]*\)\s*)?(?:@\w+(?:\([^)]*\))?\s*)*private\s+([\w.<>,]+)\s+(\w+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(src))) {
    columns.push({ column: m[1] || m[3]!, javaType: m[2]!, field: m[3]! });
  }
  if (!columns.length) {
    const loose = src.matchAll(/private\s+([\w.<>,]+)\s+(\w+)\s*;/g);
    for (const x of loose) columns.push({ column: x[2]!, javaType: x[1]!, field: x[2]! });
  }
  return { className: classMatch[1]!, table, file: rel, columns };
}

export function matchColumns(entity: FoundEntity, prompt: string) {
  const terms = queryTerms(prompt);
  const hits = entity.columns.filter((c) =>
    terms.some((t) => c.field.toLowerCase().includes(t) || c.column.toLowerCase().includes(t)),
  );
  if (hits.length) return hits;
  return entity.columns.filter((c) => /unpaid|paid|status|active|flag|amount|due/i.test(c.field));
}
