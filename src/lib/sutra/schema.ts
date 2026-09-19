import { z } from "zod";

export type LangStack =
  | "react-node"
  | "python"
  | "java"
  | "go"
  | "csharp"
  | "php"
  | "rust"
  | "ruby"
  | "kotlin";

export function detectStack(text: string): LangStack {
  const t = text.toLowerCase();
  if (/\b(fastapi|django|flask|python)\b/.test(t)) return "python";
  if (/\b(spring|java)\b/.test(t)) return "java";
  if (/\b(golang|\bgo\b)\b/.test(t)) return "go";
  if (/\b(c#|csharp|dotnet|\.net)\b/.test(t)) return "csharp";
  if (/\b(php|laravel)\b/.test(t)) return "php";
  if (/\b(rust|actix)\b/.test(t)) return "rust";
  if (/\b(ruby|rails)\b/.test(t)) return "ruby";
  if (/\bkotlin\b/.test(t)) return "kotlin";
  return "react-node";
}

const fieldType = z
  .string()
  .transform((v) => {
    const t = v.toLowerCase();
    if (t.includes("date")) return "date" as const;
    if (t.includes("num") || t === "int" || t === "decimal") return "number" as const;
    if (t.includes("select") || t.includes("enum") || t.includes("dropdown")) return "select" as const;
    if (t.includes("area") || t.includes("long")) return "textarea" as const;
    if (t.includes("check") || t.includes("bool")) return "checkbox" as const;
    return "text" as const;
  });

export const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: fieldType,
  required: z.boolean().optional().default(true),
  options: z.array(z.string()).optional(),
  help: z.string().optional(),
});

export const screenSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().transform((v) => {
    const t = v.toLowerCase();
    if (t.includes("list") || t.includes("table") || t.includes("inbox")) return "list" as const;
    if (t.includes("detail") || t.includes("view")) return "detail" as const;
    return "form" as const;
  }),
  description: z.string().default(""),
  fields: z.array(fieldSchema).optional().default([]),
});

export const apiSchema = z.object({
  method: z.string().transform((v) => {
    const m = v.toUpperCase();
    if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) return m as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    return "GET" as const;
  }),
  path: z.string(),
  name: z.string().default("handler"),
  purpose: z.string().default(""),
  request: z.string().default(""),
  response: z.string().default(""),
  role: z
    .string()
    .optional()
    .default("user")
    .transform((v) => {
      const r = (v ?? "user").toLowerCase();
      if (r.includes("admin") || r.includes("manager")) return "admin" as const;
      if (r.includes("public") || r.includes("anon")) return "public" as const;
      return "user" as const;
    }),
});

export const requirementSchema = z.object({
  id: z.string(),
  ears: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string().transform((v) => {
    const o = v.toLowerCase();
    if (o.includes("api") || o.includes("back")) return "api" as const;
    if (o.includes("data") || o.includes("db")) return "data" as const;
    return "ui" as const;
  }),
});

export const moduleSpecSchema = z.object({
  name: z.string(),
  slug: z.string(),
  summary: z.string(),
  module: z.string().default("app"),
  stack: z
    .string()
    .optional()
    .default("react-node")
    .transform((v) => detectStack(v ?? "")),
  requirements: z.array(requirementSchema).min(1),
  entities: z
    .array(
      z.object({
        name: z.string(),
        fields: z.array(fieldSchema).default([]),
      }),
    )
    .default([]),
  apis: z.array(apiSchema).min(1),
  screens: z.array(screenSchema).min(1),
  tasks: z.array(taskSchema).default([]),
});

export type FieldSpec = z.infer<typeof fieldSchema>;
export type ScreenSpec = z.infer<typeof screenSchema>;
export type ApiSpec = z.infer<typeof apiSchema>;
export type ModuleSpec = z.infer<typeof moduleSpecSchema>;

export type StudioStage =
  | "prompt"
  | "requirements"
  | "design"
  | "tasks"
  | "implement";

export type SpecFile =
  | "requirements"
  | "design"
  | "tasks"
  | "react"
  | "api"
  | "preview"
  | "terminal"
  | "permissions"
  | "keybindings";

export type ShellOs = "windows" | "macos";
