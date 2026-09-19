import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluate } from "./permissions.ts";

describe("permissions", () => {
  it("denies rm even if a user allow-* rule exists", () => {
    const r = evaluate("shell", "rm -rf /", [{ capability: "shell", match: ["*"], effect: "allow", scope: "user" }]);
    assert.equal(r.effect, "deny");
  });

  it("allows read-only git status", () => {
    assert.equal(evaluate("shell", "git status").effect, "allow");
  });

  it("asks for npm install", () => {
    assert.equal(evaluate("shell", "npm install").effect, "ask");
  });

  it("denies writing .env and mcp.json", () => {
    assert.equal(evaluate("fs_write", ".env").effect, "deny");
    assert.equal(evaluate("fs_write", "mcp.json").effect, "deny");
  });
});
