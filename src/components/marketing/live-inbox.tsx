"use client";

import { useEffect, useState } from "react";
import { Sparkles, Clock, CircleDot } from "lucide-react";

type Row = {
  id: string;
  subject: string;
  who: string;
  priority: "low" | "normal" | "high" | "urgent";
  sla: number; // 0..1 remaining
};

const ROWS: Row[] = [
  { id: "1042", subject: "Refund not received after cancellation", who: "maya@northwind.io", priority: "urgent", sla: 0.18 },
  { id: "1041", subject: "SSO login loops on Safari", who: "devon@acme.dev", priority: "high", sla: 0.46 },
  { id: "1040", subject: "How do I export my data?", who: "lina@studio.co", priority: "normal", sla: 0.72 },
  { id: "1039", subject: "Feature request: dark mode for portal", who: "sam@hatch.app", priority: "low", sla: 0.9 },
];

const priorityColor: Record<Row["priority"], string> = {
  urgent: "var(--danger)",
  high: "var(--warning)",
  normal: "var(--info)",
  low: "var(--muted)",
};

function SlaRing({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const danger = value < 0.25;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={danger ? "var(--danger)" : "var(--success)"}
        strokeWidth="2.5"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}

export function LiveInbox() {
  const [scan, setScan] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setScan((s) => (s + 1) % ROWS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="card rise relative overflow-hidden shadow-[var(--shadow)]"
      style={{ animationDelay: "0.2s" }}
    >
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[0.7rem] text-muted">
          <CircleDot size={11} className="text-success" /> live · northwind support
        </div>
        <span className="font-mono text-[0.7rem] text-muted">4 open</span>
      </div>

      <div className="divide-y divide-line">
        {ROWS.map((row, i) => {
          const scanning = scan === i;
          return (
            <div
              key={row.id}
              className="rise relative flex items-center gap-3 px-4 py-3.5"
              style={{ animationDelay: `${0.35 + i * 0.12}s` }}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-accent/[0.06] transition-opacity duration-500"
                style={{ opacity: scanning ? 1 : 0 }}
              />
              <SlaRing value={row.sla} />
              <div className="relative min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {row.subject}
                </div>
                <div className="truncate font-mono text-[0.7rem] text-muted">
                  #{row.id} · {row.who}
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                {scanning ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-[0.68rem] font-medium text-accent">
                    <Sparkles size={11} /> triaging
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.68rem] font-medium capitalize"
                    style={{
                      color: priorityColor[row.priority],
                      background: `color-mix(in oklab, ${priorityColor[row.priority]} 14%, transparent)`,
                    }}
                  >
                    {row.priority}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-line bg-surface-2/40 px-4 py-2.5 font-mono text-[0.68rem] text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={11} /> median first response · 7m
        </span>
        <span>SLA met · 98.2%</span>
      </div>
    </div>
  );
}
