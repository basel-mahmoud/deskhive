import { describe, expect, it } from "vitest";
import {
  sanitizeText,
  createTicketSchema,
  portalTicketSchema,
  emailSchema,
} from "./validation";

describe("sanitizeText", () => {
  const NUL = String.fromCharCode(0);
  const ZWSP = String.fromCharCode(0x200b);
  const BOM = String.fromCharCode(0xfeff);

  it("strips control characters", () => {
    expect(sanitizeText(`hello${NUL}world`)).toBe("helloworld");
  });

  it("keeps newlines and tabs", () => {
    expect(sanitizeText("a\nb\tc")).toBe("a\nb\tc");
  });

  it("strips zero-width characters and BOM", () => {
    expect(sanitizeText(`a${ZWSP}b${BOM}c`)).toBe("abc");
  });

  it("enforces a max length", () => {
    expect(sanitizeText("x".repeat(50), 10)).toHaveLength(10);
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeText("  hi  ")).toBe("hi");
  });
});

describe("emailSchema", () => {
  it("lowercases and accepts valid emails", () => {
    expect(emailSchema.parse("USER@Example.com")).toBe("user@example.com");
  });
  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("createTicketSchema", () => {
  it("accepts a valid ticket and defaults priority", () => {
    const r = createTicketSchema.parse({
      subject: "Help me",
      body: "Something is broken",
      requesterEmail: "a@b.com",
    });
    expect(r.priority).toBe("normal");
  });
  it("rejects an empty subject", () => {
    expect(
      createTicketSchema.safeParse({
        subject: "",
        body: "x",
        requesterEmail: "a@b.com",
      }).success,
    ).toBe(false);
  });
});

describe("portalTicketSchema honeypot", () => {
  it("allows an empty company field", () => {
    const r = portalTicketSchema.safeParse({
      subject: "Hi there",
      body: "Need help",
      requesterEmail: "a@b.com",
      company: "",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a filled honeypot", () => {
    const r = portalTicketSchema.safeParse({
      subject: "Hi there",
      body: "Need help",
      requesterEmail: "a@b.com",
      company: "Acme Inc",
    });
    expect(r.success).toBe(false);
  });
});
