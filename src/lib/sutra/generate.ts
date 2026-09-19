import { createServerFn } from "@tanstack/react-start";
import { detectStack, moduleSpecSchema, type ModuleSpec } from "./schema";

const SYSTEM = `You are Sutra, a spec-driven software IDE for professional developers on Windows and macOS.
You turn a product prompt into a module specification. No government or domain assumptions.

Rules:
- Output ONE JSON object only. No markdown.
- Default stack is React UI + Node/Express REST APIs unless the prompt names another language.
- If the prompt names Python, Java, Go, C#, PHP, Rust, Ruby, or Kotlin, set "stack" to that language (python|java|go|csharp|php|rust|ruby|kotlin|react-node).
- Requirements use EARS: "WHEN <condition> THE SYSTEM SHALL <behaviour>".
- Paths look like /api/{slug}/...
- Screens: at least one list and one form.
- Field names camelCase. Roles: user, admin, or public.
- slug is lowercase hyphenated.
- Do not invent payment card CVV, passwords in logs, or PII beyond what the prompt needs.

JSON shape:
{
  "name": string,
  "slug": string,
  "summary": string,
  "module": "web" | "api" | "app",
  "stack": "react-node" | "python" | "java" | "go" | "csharp" | "php" | "rust" | "ruby" | "kotlin",
  "requirements": [{"id":"R1","ears":"..."}],
  "entities": [{"name":"...","fields":[{"name":"...","label":"...","type":"text|number|date|select|textarea|checkbox","required":true,"options":["..."],"help":"..."}]}],
  "apis": [{"method":"GET|POST|PUT|PATCH|DELETE","path":"/api/...","name":"...","purpose":"...","request":"...","response":"...","role":"user|admin|public"}],
  "screens": [{"id":"...","name":"...","type":"list|form|detail","description":"...","fields":[same as entity fields]}],
  "tasks": [{"id":"T1","title":"...","owner":"ui|api|data"}]
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export const generateModuleSpec = createServerFn({ method: "POST" })
  .validator((input: { prompt: string }) => {
    const prompt = input.prompt.trim();
    if (prompt.length < 8) throw new Error("Describe the module in a bit more detail.");
    if (prompt.length > 2000) throw new Error("Prompt is too long.");
    return { prompt };
  })
  .handler(async ({ data }): Promise<{ ok: true; spec: ModuleSpec } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Hosted model is not available in this environment." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.25,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Hosted model error ${res.status}` };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      return { ok: false, error: "Hosted model returned an empty spec. Try again." };
    }
    try {
      const parsed = moduleSpecSchema.parse(extractJson(text));
      const entityFields = parsed.entities[0]?.fields ?? [];
      const fromPrompt = detectStack(data.prompt);
      const spec: ModuleSpec = {
        ...parsed,
        stack: fromPrompt !== "react-node" ? fromPrompt : parsed.stack,
        tasks:
          parsed.tasks.length > 0
            ? parsed.tasks
            : [
                { id: "T1", title: "Render screens from the approved spec", owner: "ui" },
                { id: "T2", title: "Generate REST API routes", owner: "api" },
                { id: "T3", title: "Wire the in-browser preview store", owner: "data" },
              ],
        screens: parsed.screens.map((s) =>
          s.fields.length === 0 && entityFields.length
            ? { ...s, fields: entityFields }
            : s,
        ),
      };
      return { ok: true, spec };
    } catch (err) {
      console.error("Sutra spec parse failed", err, text.slice(0, 800));
      const detail =
        err && typeof err === "object" && "issues" in err
          ? JSON.stringify((err as { issues: unknown }).issues).slice(0, 280)
          : "Could not parse JSON spec";
      return {
        ok: false,
        error: `Spec did not validate: ${detail}`,
      };
    }
  });
