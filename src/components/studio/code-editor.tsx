import { useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { languageFromPath, KEYWORD_COMPLETIONS } from "@/lib/sutra/languages";
import { loadThemePref, resolvedTheme } from "@/lib/sutra/theme";

let monacoReady = false;

function bootMonaco(monaco: typeof import("monaco-editor")) {
  if (monacoReady) return;
  monacoReady = true;
  monaco.editor.defineTheme("sutra-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1a1a22",
      "editor.foreground": "#e8e8f0",
      "editorLineNumber.foreground": "#6b6b7a",
    },
  });
  monaco.editor.defineTheme("sutra-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: { "editor.background": "#f3f3f6" },
  });
  const tsLang = monaco.languages as typeof monaco.languages & {
    typescript?: {
      typescriptDefaults: { setCompilerOptions: (o: object) => void };
      javascriptDefaults: { setDiagnosticsOptions: (o: object) => void };
      JsxEmit: { ReactJSX: number };
      ScriptTarget: { ES2022: number };
      ModuleResolutionKind: { NodeJs: number };
    };
  };
  const ts = tsLang.typescript;
  if (ts) {
    ts.typescriptDefaults.setCompilerOptions({
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    });
    ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false });
  }
  for (const [lang, words] of Object.entries(KEYWORD_COMPLETIONS)) {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: words.map((w) => ({
            label: w,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: w,
            range,
          })),
        };
      },
    });
  }
}

export type Marker = { file: string; message: string; severity: "error" | "warning"; line: number };

export function CodeEditor({
  path,
  value,
  onChange,
  wrap,
  lineNumbers,
  minimap,
  onCursor,
  onMarkers,
  extraFiles,
}: {
  path?: string;
  value: string;
  onChange: (v: string) => void;
  wrap?: boolean;
  lineNumbers?: boolean;
  minimap?: boolean;
  onCursor?: (line: number, col: number) => void;
  onMarkers?: (m: Marker[]) => void;
  extraFiles?: { path: string; content: string }[];
}) {
  const [client, setClient] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lang = languageFromPath(path ?? "file.ts");
  const theme = resolvedTheme(loadThemePref()) === "light" ? "sutra-light" : "sutra-dark";

  useEffect(() => setClient(true), []);

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    bootMonaco(monaco);
    monaco.editor.setTheme(theme);
    ed.onDidChangeCursorPosition((e) => onCursor?.(e.position.lineNumber, e.position.column));
    monaco.editor.onDidChangeMarkers(() => {
      const mine = monaco.editor.getModelMarkers({ resource: ed.getModel()?.uri });
      onMarkers?.(
        mine.map((m: { message: string; severity: number; startLineNumber: number }) => ({
          file: path ?? "file",
          message: m.message,
          severity: m.severity > 4 ? "error" : "warning",
          line: m.startLineNumber,
        })),
      );
    });
    extraFiles?.forEach((f) => {
      const uri = monaco.Uri.parse(`file:///${f.path.replaceAll("\\", "/")}`);
      if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(f.content, languageFromPath(f.path), uri);
      }
    });
  };

  if (!client) {
    return <p className="p-3 text-xs text-subtle">Loading language engine…</p>;
  }

  return (
    <div className="min-h-0 flex-1">
      <Editor
        height="100%"
        language={lang}
        path={path ?? "untitled.ts"}
        theme={theme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={onMount}
        options={{
          minimap: { enabled: Boolean(minimap) },
          wordWrap: wrap ? "on" : "off",
          lineNumbers: lineNumbers === false ? "off" : "on",
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          automaticLayout: true,
          tabSize: 2,
          glyphMargin: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          parameterHints: { enabled: true },
          scrollbar: { verticalScrollbarSize: 10 },
        }}
      />
    </div>
  );
}

loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
