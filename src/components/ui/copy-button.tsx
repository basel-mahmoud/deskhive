"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-2.5 py-1.5 text-xs text-ink-dim transition-colors hover:bg-surface-2"
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}
