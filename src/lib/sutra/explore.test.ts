import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchColumns, parseJavaEntity, queryTerms } from "./explore-parse.ts";

describe("queryTerms", () => {
  it("keeps unpaid and employee", () => {
    const t = queryTerms("write a code for filter unpaid employees screen");
    assert.ok(t.includes("unpaid"));
    assert.ok(t.includes("employees"));
    assert.equal(t.includes("write"), false);
  });
});

describe("parseJavaEntity", () => {
  it("reads table and unpaid column", () => {
    const src = `
@Entity
@Table(name = "EMPLOYEE")
public class Employee {
  @Id private Long id;
  @Column(name = "UNPAID")
  private Boolean unpaid;
  private String name;
}
`;
    const e = parseJavaEntity("Employee.java", src);
    assert.ok(e);
    assert.equal(e!.table, "EMPLOYEE");
    assert.ok(e!.columns.some((c) => c.field === "unpaid"));
    assert.ok(matchColumns(e!, "filter unpaid employees").some((c) => c.field === "unpaid"));
  });
});
