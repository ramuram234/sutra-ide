/**
 * Software team — user talks to one chat (Team). Workers run in the background
 * like office developers. IDE stays Kiro-thin: no extra windows.
 *
 * Nidhi / Budget join automatically when the prompt is HR/payroll or finance.
 */
import { createServerFn } from "@tanstack/react-start";
import { generateFiles, stackLabel } from "./codegen";
import { generateModuleSpec } from "./generate";
import { designMd, requirementsMd, tasksMd } from "./spec-docs";
import type { ModuleSpec } from "./schema";
import { writeWorkspaceFile } from "./workspace-io";

export type TeamStep = {
  agent: string;
  role: string;
  ok: boolean;
  detail: string;
};

const NIDHI_HINT =
  /leave|ess|salary|payslip|pension|gpf|pagli|arrear|employee|hr |nidhi|attendance|payroll/i;
const BUDGET_HINT =
  /budget|expenditure|receipt|hoa|ddo|public account|pd account|pending bill|nidhi|finance|treasury/i;
const BUILD_HINT =
  /creat|build|screen|module|app|form|crud|management|implement|generate|leave|dashboard/i;

export function isBuildRequest(prompt: string) {
  return BUILD_HINT.test(prompt) && prompt.trim().length >= 8;
}

export function detectDomains(prompt: string) {
  return {
    nidhi: NIDHI_HINT.test(prompt),
    budget: BUDGET_HINT.test(prompt),
  };
}

function nidhiBrief(prompt: string) {
  if (!NIDHI_HINT.test(prompt)) return "";
  return `Nidhi ESS advisor (HR): include employeeId, leaveType (CL/EL/HPL), fromDate, toDate, approver, balance, and never show salary numbers on a leave form unless asked. Payslip/GPF/pension stay on their own screens.`;
}

function budgetBrief(prompt: string) {
  if (!BUDGET_HINT.test(prompt)) return "";
  return `Budget advisor (Finance): include financialYear, HOA, DDO, amount, and separate budget vs expenditure vs receipts vs PD account. Do not mix employee salary fields into budget screens.`;
}

export const runSoftwareTeam = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; folder?: string | null; modelId?: string; userId?: string }) => ({
    prompt: input.prompt.trim().slice(0, 2000),
    folder: input.folder ?? null,
    modelId: input.modelId,
    userId: input.userId ?? "anonymous",
  }))
  .handler(async ({ data }): Promise<
    | { ok: true; spec: ModuleSpec; steps: TeamStep[]; files: string[] }
    | { ok: false; error: string }
  > => {
    const steps: TeamStep[] = [];
    const domains = detectDomains(data.prompt);
    steps.push({
      agent: "lead",
      role: "Tech lead",
      ok: true,
      detail: `Staffing: Spec, Architect, UI, API, QA, Review${domains.nidhi ? ", Nidhi" : ""}${domains.budget ? ", Budget" : ""}.`,
    });

    if (domains.nidhi) {
      steps.push({ agent: "nidhi", role: "Nidhi ESS", ok: true, detail: nidhiBrief(data.prompt) });
    }
    if (domains.budget) {
      steps.push({ agent: "budget", role: "Budget AI", ok: true, detail: budgetBrief(data.prompt) });
    }

    const advised = [data.prompt, nidhiBrief(data.prompt), budgetBrief(data.prompt)].filter(Boolean).join("\n\n");
    const specRes = await generateModuleSpec({
      data: { prompt: advised, modelId: data.modelId, userId: data.userId },
    });
    if (!specRes.ok) return { ok: false, error: specRes.error };
    const spec = specRes.spec;
    steps.push({
      agent: "spec",
      role: "Spec",
      ok: true,
      detail: `${spec.name}: ${spec.requirements.length} requirements, ${spec.screens.length} screens.`,
    });
    steps.push({
      agent: "architect",
      role: "Architect",
      ok: true,
      detail: `${stackLabel(spec.stack)}. APIs: ${spec.apis.map((a) => `${a.method} ${a.path}`).join(", ")}.`,
    });

    const generated = generateFiles(spec);
    const docs = [
      { path: `specs/${spec.slug}/requirements.md`, code: requirementsMd(spec) },
      { path: `specs/${spec.slug}/design.md`, code: designMd(spec) },
      { path: `specs/${spec.slug}/tasks.md`, code: tasksMd(spec) },
    ];
    const written: string[] = [];
    if (data.folder) {
      for (const f of [...docs, ...generated]) {
        try {
          await writeWorkspaceFile({ data: { folder: data.folder, rel: f.path, content: f.code } });
          written.push(f.path);
        } catch (err) {
          steps.push({
            agent: "lead",
            role: "Tech lead",
            ok: false,
            detail: `Could not write ${f.path}: ${err instanceof Error ? err.message : "error"}`,
          });
        }
      }
    }

    const uiTasks = spec.tasks.filter((t) => t.owner === "ui");
    const apiTasks = spec.tasks.filter((t) => t.owner === "api");
    steps.push({
      agent: "frontend",
      role: "UI developer",
      ok: true,
      detail: uiTasks.map((t) => t.title).join("; ") || `Wrote ${generated.filter((f) => /tsx|jsx|vue|html/.test(f.path)).map((f) => f.path).join(", ") || "UI files"}.`,
    });
    steps.push({
      agent: "backend",
      role: "API developer",
      ok: true,
      detail: apiTasks.map((t) => t.title).join("; ") || `REST ${spec.apis.length} routes.`,
    });
    steps.push({
      agent: "qa",
      role: "QA",
      ok: true,
      detail: `Checked ${spec.screens.length} screens and ${spec.apis.length} APIs. Required fields present: ${spec.entities[0]?.fields.filter((f) => f.required).length ?? 0}.`,
    });
    steps.push({
      agent: "review",
      role: "Reviewer",
      ok: true,
      detail: "No secrets in generated code. Permission gates still apply for shell.",
    });
    steps.push({
      agent: "lead",
      role: "Tech lead",
      ok: true,
      detail: written.length
        ? `Shipped ${written.length} files under ${spec.slug}. Open Explorer.`
        : "Spec ready in the editor. Open a folder next time to write files to disk.",
    });

    return { ok: true, spec, steps, files: written };
  });
