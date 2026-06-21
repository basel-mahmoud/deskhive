import { describe, expect, it } from "vitest";
import { newId, slugify, newToken } from "./ids";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Northwind Support")).toBe("northwind-support");
  });
  it("strips punctuation and collapses separators", () => {
    expect(slugify("  Acme!! Inc.  ")).toBe("acme-inc");
  });
  it("caps length at 40", () => {
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(40);
  });
});

describe("newId", () => {
  it("prefixes and is reasonably unique", () => {
    const a = newId("tkt");
    const b = newId("tkt");
    expect(a.startsWith("tkt_")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("newToken", () => {
  it("is 40 chars", () => {
    expect(newToken()).toHaveLength(40);
  });
});
