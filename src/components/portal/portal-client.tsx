"use client";

import { useState } from "react";
import { CheckCircle2, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

const field =
  "w-full rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent";

type Tracked = {
  number: number;
  subject: string;
  status: string;
  priority: string;
};

export function PortalClient({ slug }: { slug: string }) {
  const [tab, setTab] = useState<"new" | "track">("new");

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-line">
        <TabButton active={tab === "new"} onClick={() => setTab("new")}>
          Submit a request
        </TabButton>
        <TabButton active={tab === "track"} onClick={() => setTab("track")}>
          Track a ticket
        </TabButton>
      </div>
      <div className="p-6">
        {tab === "new" ? <NewRequest slug={slug} /> : <Track slug={slug} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-b-2 border-accent text-ink"
          : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function NewRequest({ slug }: { slug: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch(`/api/portal/${slug}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          subject: fd.get("subject"),
          body: fd.get("body"),
          requesterEmail: fd.get("requesterEmail"),
          requesterName: fd.get("requesterName") || "",
          company: fd.get("company") || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDone(data.number);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (done !== null) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <h3 className="mt-4 font-display text-lg font-semibold">
          Request received
        </h3>
        <p className="mt-1 text-sm text-muted">
          Your ticket number is{" "}
          <span className="font-mono text-ink">#{done}</span>. Keep it to track
          progress.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => setDone(null)}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Subject</label>
        <input name="subject" required maxLength={200} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Your email</label>
          <input name="requesterEmail" type="email" required className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Your name <span className="text-muted">(optional)</span>
          </label>
          <input name="requesterName" maxLength={100} className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          How can we help?
        </label>
        <textarea
          name="body"
          required
          rows={6}
          maxLength={5000}
          className={`${field} resize-y`}
        />
      </div>
      {/* Honeypot field, visually hidden from humans */}
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        <Send size={15} /> {pending ? "Sending…" : "Submit request"}
      </Button>
    </form>
  );
}

function Track({ slug }: { slug: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Tracked | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/portal/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: fd.get("number"),
          email: fd.get("email"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setResult(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Ticket number
          </label>
          <input
            name="number"
            type="number"
            required
            placeholder="1042"
            className={field}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Your email</label>
          <input name="email" type="email" required className={field} />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result && (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted">#{result.number}</span>
            <StatusBadge status={result.status} />
          </div>
          <p className="mt-2 text-sm text-ink">{result.subject}</p>
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <Search size={15} /> {pending ? "Looking…" : "Track ticket"}
      </Button>
    </form>
  );
}
