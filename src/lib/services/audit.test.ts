import { describe, expect, it } from "vitest";
import { hashEntry, verifyChain, type AuditEntry } from "./audit";

type Row = Parameters<typeof verifyChain>[0][number];

function buildChain(entries: AuditEntry[]): Row[] {
  const rows: Row[] = [];
  let prevHash: string | null = null;
  for (const e of entries) {
    const hash = hashEntry(e, prevHash);
    rows.push({
      workspaceId: e.workspaceId,
      actorId: e.actorId ?? null,
      actorType: e.actorType ?? "user",
      action: e.action,
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      metadata: e.metadata ?? null,
      prevHash,
      hash,
    });
    prevHash = hash;
  }
  return rows;
}

const sample: AuditEntry[] = [
  { workspaceId: "ws_1", actorId: "u1", action: "workspace.created" },
  { workspaceId: "ws_1", actorId: "u1", action: "ticket.created", targetId: "t1" },
  { workspaceId: "ws_1", actorId: "u1", action: "ticket.replied", targetId: "t1" },
];

describe("audit hash chain", () => {
  it("verifies an intact chain", () => {
    expect(verifyChain(buildChain(sample))).toEqual({ ok: true });
  });

  it("verifies an empty chain", () => {
    expect(verifyChain([])).toEqual({ ok: true });
  });

  it("detects a tampered payload", () => {
    const rows = buildChain(sample);
    rows[1] = { ...rows[1], action: "ticket.deleted" }; // tamper, keep old hash
    const res = verifyChain(rows);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(1);
  });

  it("detects a removed entry (broken prev link)", () => {
    const rows = buildChain(sample);
    const truncated = [rows[0], rows[2]]; // drop the middle
    expect(verifyChain(truncated).ok).toBe(false);
  });

  it("produces different hashes for different prev hashes", () => {
    const e = sample[0];
    expect(hashEntry(e, null)).not.toBe(hashEntry(e, "abc"));
  });
});
