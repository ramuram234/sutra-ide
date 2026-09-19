import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFrameworkHints, detectProject } from "./discovery.ts";

describe("detectProject", () => {
  it("sees a Node/React app from manifests, not from a recipe", () => {
    const f = detectProject(["package.json", "src/App.tsx", "Dockerfile"]);
    assert.ok(f.languages.includes("typescript") || f.languages.includes("javascript"));
    assert.ok(f.packageManagers.includes("npm"));
    assert.ok(f.infra.includes("docker"));
    const facts = { ...f };
    detectFrameworkHints("package.json", JSON.stringify({ dependencies: { react: "19" } }), facts);
    assert.ok(facts.frameworks.includes("react"));
  });

  it("sees Maven Java without assuming Spring", () => {
    const f = detectProject(["pom.xml", "src/main/java/App.java"]);
    assert.ok(f.languages.includes("java"));
    assert.ok(f.build.includes("maven"));
    assert.equal(f.frameworks.includes("spring"), false);
  });

  it("sees Go, Rust, Python from lockfiles", () => {
    const f = detectProject(["go.mod", "Cargo.toml", "pyproject.toml"]);
    assert.ok(f.languages.includes("go"));
    assert.ok(f.languages.includes("rust"));
    assert.ok(f.languages.includes("python"));
  });
});
