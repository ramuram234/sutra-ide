/** Map a file path to a Monaco / LSP language id. */

const EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  py: "python",
  java: "java",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  kt: "kotlin",
  kts: "kotlin",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
  sh: "shell",
  bash: "shell",
  sql: "sql",
  toml: "ini",
  env: "ini",
  dockerfile: "dockerfile",
};

export function languageFromPath(path: string) {
  const base = path.split(/[/\\]/).pop() ?? path;
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = (base.split(".").pop() ?? "").toLowerCase();
  return EXT[ext] ?? "plaintext";
}

export const KEYWORD_COMPLETIONS: Record<string, string[]> = {
  python: ["def", "class", "import", "from", "return", "async", "await", "lambda", "yield", "with", "try", "except", "self", "None", "True", "False"],
  java: ["public", "private", "class", "interface", "void", "static", "final", "return", "new", "import", "package", "throws"],
  go: ["func", "package", "import", "return", "struct", "interface", "go", "defer", "chan", "map", "error"],
  rust: ["fn", "let", "mut", "struct", "enum", "impl", "trait", "pub", "use", "mod", "match", "async"],
  csharp: ["public", "private", "class", "void", "string", "async", "await", "using", "namespace", "return"],
  php: ["function", "class", "public", "private", "echo", "return", "namespace", "use"],
  ruby: ["def", "class", "module", "end", "do", "yield", "require", "attr_accessor"],
  kotlin: ["fun", "val", "var", "class", "data", "suspend", "companion", "object"],
};

/** How a real language server is launched on the desktop host. */
export const LSP_LAUNCH: Record<string, { command: string; args: string[] }> = {
  typescript: { command: "typescript-language-server", args: ["--stdio"] },
  javascript: { command: "typescript-language-server", args: ["--stdio"] },
  python: { command: "pylsp", args: [] },
  java: { command: "jdtls", args: [] },
  go: { command: "gopls", args: [] },
  rust: { command: "rust-analyzer", args: [] },
  csharp: { command: "csharp-ls", args: [] },
  php: { command: "intelephense", args: ["--stdio"] },
  ruby: { command: "solargraph", args: ["stdio"] },
  kotlin: { command: "kotlin-language-server", args: [] },
};
