/**
 * Workspace discovery — detectors only. No product or language recipes.
 * The agent learns stack from these signals; the runtime never assumes Spring/AWS/etc.
 */
export type ProjectFacts = {
  languages: string[];
  build: string[];
  frameworks: string[];
  packageManagers: string[];
  infra: string[];
  test: string[];
  markers: string[];
};

const RULES: { file: RegExp; apply: (facts: ProjectFacts, name: string) => void }[] = [
  { file: /(^|\/)package\.json$/, apply: (f) => { f.languages.push("javascript"); f.packageManagers.push("npm"); f.markers.push("package.json"); } },
  { file: /(^|\/)pnpm-lock\.yaml$/, apply: (f) => f.packageManagers.push("pnpm") },
  { file: /(^|\/)yarn\.lock$/, apply: (f) => f.packageManagers.push("yarn") },
  { file: /(^|\/)pom\.xml$/, apply: (f) => { f.languages.push("java"); f.build.push("maven"); f.markers.push("pom.xml"); } },
  { file: /(^|\/)build\.gradle(\.kts)?$/, apply: (f) => { f.build.push("gradle"); f.markers.push("build.gradle"); } },
  { file: /(^|\/)Cargo\.toml$/, apply: (f) => { f.languages.push("rust"); f.build.push("cargo"); } },
  { file: /(^|\/)go\.mod$/, apply: (f) => { f.languages.push("go"); f.build.push("go"); } },
  { file: /(^|\/)pyproject\.toml$|(^|\/)requirements\.txt$|(^|\/)Pipfile$/, apply: (f) => { f.languages.push("python"); f.packageManagers.push("pip"); } },
  { file: /(^|\/)composer\.json$/, apply: (f) => { f.languages.push("php"); f.packageManagers.push("composer"); } },
  { file: /(^|\/)Gemfile$/, apply: (f) => { f.languages.push("ruby"); f.packageManagers.push("bundler"); } },
  { file: /\.csproj$/, apply: (f) => { f.languages.push("csharp"); f.build.push("dotnet"); } },
  { file: /(^|\/)CMakeLists\.txt$/, apply: (f) => { f.languages.push("c++"); f.build.push("cmake"); } },
  { file: /\.tsx?$/, apply: (f) => f.languages.push("typescript") },
  { file: /\.jsx?$/, apply: (f) => f.languages.push("javascript") },
  { file: /\.java$/, apply: (f) => f.languages.push("java") },
  { file: /\.kt$/, apply: (f) => f.languages.push("kotlin") },
  { file: /\.py$/, apply: (f) => f.languages.push("python") },
  { file: /\.go$/, apply: (f) => f.languages.push("go") },
  { file: /\.rs$/, apply: (f) => f.languages.push("rust") },
  { file: /\.php$/, apply: (f) => f.languages.push("php") },
  { file: /(^|\/)Dockerfile$/, apply: (f) => f.infra.push("docker") },
  { file: /(^|\/)docker-compose\.ya?ml$/, apply: (f) => f.infra.push("compose") },
  { file: /(^|\/)terraform\/|(^|\/).+\.tf$/, apply: (f) => f.infra.push("terraform") },
  { file: /(^|\/)(k8s|kubernetes|helm)\//, apply: (f) => f.infra.push("kubernetes") },
  { file: /(^|\/)vitest\.|(^|\/)jest\.config/, apply: (f) => f.test.push("js-test") },
  { file: /(^|\/)pytest\.ini$|_test\.py$|\.test\.[jt]sx?$/, apply: (f) => f.test.push("unit") },
];

function unique(xs: string[]) {
  return [...new Set(xs.filter(Boolean))];
}

export function detectProject(files: string[]): ProjectFacts {
  const facts: ProjectFacts = {
    languages: [],
    build: [],
    frameworks: [],
    packageManagers: [],
    infra: [],
    test: [],
    markers: [],
  };
  for (const name of files) {
    for (const rule of RULES) {
      if (rule.file.test(name.replaceAll("\\", "/"))) rule.apply(facts, name);
    }
  }
  return {
    languages: unique(facts.languages),
    build: unique(facts.build),
    frameworks: unique(facts.frameworks),
    packageManagers: unique(facts.packageManagers),
    infra: unique(facts.infra),
    test: unique(facts.test),
    markers: unique(facts.markers),
  };
}

/** Optional hints from file *contents* — still detectors, not recipes. */
export function detectFrameworkHints(rel: string, content: string, facts: ProjectFacts) {
  const n = rel.replaceAll("\\", "/").toLowerCase();
  const c = content.slice(0, 4000);
  if (n.endsWith("package.json")) {
    if (/"react"/.test(c)) facts.frameworks.push("react");
    if (/"next"/.test(c) || /"nextjs"/.test(c)) facts.frameworks.push("next");
    if (/"express"/.test(c)) facts.frameworks.push("express");
    if (/"vue"/.test(c)) facts.frameworks.push("vue");
  }
  if (n.endsWith("pom.xml") || n.includes("build.gradle")) {
    if (/springframework|spring-boot/i.test(c)) facts.frameworks.push("spring");
  }
  if (n.endsWith("pyproject.toml") || n.endsWith("requirements.txt")) {
    if (/django/i.test(c)) facts.frameworks.push("django");
    if (/fastapi/i.test(c)) facts.frameworks.push("fastapi");
    if (/flask/i.test(c)) facts.frameworks.push("flask");
  }
  facts.frameworks = unique(facts.frameworks);
}

export function formatFacts(facts: ProjectFacts) {
  const line = (k: string, xs: string[]) => (xs.length ? `${k}: ${xs.join(", ")}` : null);
  return [
    line("languages", facts.languages),
    line("build", facts.build),
    line("package managers", facts.packageManagers),
    line("frameworks (from manifests)", facts.frameworks),
    line("infra", facts.infra),
    line("tests", facts.test),
  ]
    .filter(Boolean)
    .join("\n") || "unknown stack — inspect files";
}
