import { createServerFn } from "@tanstack/react-start";

export type MarketExt = {
  id: string;
  name: string;
  publisher: string;
  description: string;
  downloads: number;
  sutra: boolean;
};

const FEATURED: MarketExt[] = [
  { id: "sutra.theme-dark", name: "Sutra Dark", publisher: "Sutra", description: "Default dark workbench theme.", downloads: 0, sutra: true },
  { id: "sutra.snippets", name: "Sutra Snippets", publisher: "Sutra", description: "React, Python, Java, Go snippets in the editor.", downloads: 0, sutra: true },
  { id: "sutra.python-keywords", name: "Python keywords", publisher: "Sutra", description: "Keyword IntelliSense until pylsp is installed.", downloads: 0, sutra: true },
];

export const searchMarketplace = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: input.query.trim().slice(0, 80) }))
  .handler(async ({ data }): Promise<MarketExt[]> => {
    const q = data.query.toLowerCase();
    const local = FEATURED.filter((e) => !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    try {
      const url = `https://open-vsx.org/api/-/search?query=${encodeURIComponent(data.query || "python")}&size=12`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return local;
      const json = (await res.json()) as {
        extensions?: { namespace?: string; name?: string; files?: unknown; description?: string; downloadCount?: number }[];
      };
      const remote: MarketExt[] = (json.extensions ?? []).map((e) => ({
        id: `${e.namespace}.${e.name}`,
        name: e.name ?? "extension",
        publisher: e.namespace ?? "open-vsx",
        description: (e.description ?? "").slice(0, 160),
        downloads: e.downloadCount ?? 0,
        sutra: false,
      }));
      return [...local, ...remote];
    } catch {
      return local;
    }
  });
