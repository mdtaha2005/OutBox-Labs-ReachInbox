import { describe, it, expect } from "vitest";
import { parseLeadsContent } from "../../src/utils/csv-parser.js";

describe("CSV Lead Parser", () => {
  it("should extract valid emails from comma and newline separated lists", () => {
    const raw = `
      test1@example.com, test2@company.org
      invalid-email
      test3@domain.co.in
      test1@example.com
    `;

    const result = parseLeadsContent(raw);

    expect(result.validLeads).toEqual([
      "test1@example.com",
      "test2@company.org",
      "test3@domain.co.in",
    ]);
    expect(result.invalidCount).toBe(1);
    expect(result.totalCount).toBe(4);
  });

  it("should ignore standard header rows like 'email' or 'Email Address'", () => {
    const raw = "Email Address\nalice@test.com\nbob@test.com";
    const result = parseLeadsContent(raw);

    expect(result.validLeads).toEqual(["alice@test.com", "bob@test.com"]);
    expect(result.invalidCount).toBe(0);
  });
});