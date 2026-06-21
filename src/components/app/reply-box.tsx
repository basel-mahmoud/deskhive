"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, StickyNote } from "lucide-react";
import { replyAction, type ActionState } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";

export function ReplyBox({
  slug,
  ticketId,
  aiDraft,
  canReply,
}: {
  slug: string;
  ticketId: string;
  aiDraft?: string | null;
  canReply: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    replyAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      // Reset the composer and refresh the thread after a successful send.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBody("");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  if (!canReply) {
    return (
      <div className="border-t border-line bg-surface/40 px-6 py-4 text-center text-sm text-muted">
        You have viewer access — replies are disabled.
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="border-t border-line bg-surface/40 p-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <div
        className={`rounded-[var(--radius-md)] border ${internal ? "border-warning/40 bg-warning/[0.04]" : "border-line-strong bg-surface-2"}`}
      >
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          maxLength={10000}
          placeholder={
            internal ? "Add an internal note (customer can't see this)…" : "Write a reply…"
          }
          className="w-full resize-y bg-transparent px-3.5 py-3 text-sm text-ink outline-none"
        />
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-dim">
            <input
              type="checkbox"
              name="isInternalNote"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <StickyNote size={13} /> Internal note
          </label>
          <div className="flex items-center gap-2">
            {aiDraft && (
              <button
                type="button"
                onClick={() => setBody(aiDraft)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
              >
                <Sparkles size={13} /> Use AI draft
              </button>
            )}
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              <Send size={14} />
              {pending ? "Sending…" : internal ? "Add note" : "Send reply"}
            </Button>
          </div>
        </div>
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
