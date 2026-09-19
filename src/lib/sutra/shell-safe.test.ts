import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  contained,
  gitSubcommandOk,
  hasMetacharacters,
  isProtectedRel,
  npmSubcommandOk,
  safePathEnv,
  safeRel,
  tokenize,
} from "./shell-safe.ts";

describe("shell-safe", () => {
  it("tokenizes quotes without treating inner spaces as argv", () => {
    assert.deepEqual(tokenize(`echo "hello world"`), ["echo", "hello world"]);
  });

  it("blocks pipes and command chaining", () => {
    assert.equal(hasMetacharacters("ls | cat"), true);
    assert.equal(hasMetacharacters("npm install"), false);
  });

  it("rejects path traversal", () => {
    assert.equal(safeRel("../etc/passwd"), null);
    assert.equal(safeRel("/etc/passwd"), null);
    assert.equal(safeRel("src/app.tsx"), "src/app.tsx");
  });

  it("contained does not treat prefix paths as inside the workspace", () => {
    const root = path.join("C:", "Sutra", "workspace");
    assert.equal(contained(root, path.join("C:", "Sutra", "workspace-evil", "x")), false);
    assert.equal(contained(root, path.join(root, "src")), true);
  });

  it("protects env, git, mcp, keys", () => {
    assert.equal(isProtectedRel(".env"), true);
    assert.equal(isProtectedRel("mcp.json"), true);
    assert.equal(isProtectedRel(".git/config"), true);
    assert.equal(isProtectedRel("src/app.tsx"), false);
  });

  it("strips cwd from PATH", () => {
    const d = path.delimiter;
    assert.equal(safePathEnv(`.${d}/usr/bin`), "/usr/bin");
  });

  it("limits npm and git", () => {
    assert.equal(npmSubcommandOk("publish"), false);
    assert.equal(npmSubcommandOk("install"), true);
    assert.equal(gitSubcommandOk("push"), false);
    assert.equal(gitSubcommandOk("status"), true);
  });
});
