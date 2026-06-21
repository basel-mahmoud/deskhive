"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, UserPlus, X } from "lucide-react";
import {
  inviteAction,
  changeRoleAction,
  removeMemberAction,
  revokeInviteAction,
  type ActionState,
} from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

type Member = {
  id: string;
  userId: string;
  role: string;
  email: string;
  name: string | null;
};
type Invite = { id: string; email: string; role: string; token: string };

const field =
  "rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent";

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-2.5 py-1.5 text-xs text-ink-dim hover:bg-surface-2"
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy invite link"}
    </button>
  );
}

export function MembersManager({
  slug,
  canManage,
  currentUserId,
  members,
  invites,
}: {
  slug: string;
  canManage: boolean;
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    inviteAction,
    {},
  );
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {canManage && (
        <section className="card p-6">
          <h2 className="font-display text-base font-semibold">Invite a teammate</h2>
          <p className="mt-1 text-sm text-muted">
            They&apos;ll join after opening the invite link and signing in with
            the invited email.
          </p>
          <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={slug} />
            <div className="min-w-[220px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted uppercase">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@company.com"
                className={`${field} w-full`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted uppercase">
                Role
              </label>
              <select name="role" defaultValue="agent" className={field}>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              <UserPlus size={15} /> {pending ? "Inviting…" : "Send invite"}
            </Button>
          </form>
          {state.error && (
            <p className="mt-3 text-sm text-danger">{state.error}</p>
          )}
          {state.ok && state.inviteUrl && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-success/30 bg-success/[0.06] px-3 py-2">
              <span className="truncate font-mono text-xs text-ink-dim">
                {state.inviteUrl}
              </span>
              <CopyLink url={state.inviteUrl} />
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-base font-semibold">
          Members <span className="font-mono text-sm text-muted">{members.length}</span>
        </h2>
        <div className="card divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-ink-dim">
                {initials(m.name, m.email)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {m.name || m.email}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs text-muted">you</span>
                  )}
                </div>
                <div className="truncate text-xs text-muted">{m.email}</div>
              </div>
              {canManage && m.userId !== currentUserId ? (
                <div className="flex items-center gap-2">
                  <RoleForm slug={slug} memberId={m.id} role={m.role} />
                  <RemoveForm slug={slug} memberId={m.id} />
                </div>
              ) : (
                <RoleBadge role={m.role} />
              )}
            </div>
          ))}
        </div>
      </section>

      {canManage && invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-base font-semibold">
            Pending invites
          </h2>
          <div className="card divide-y divide-line">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink">{inv.email}</div>
                  <div className="text-xs text-muted capitalize">{inv.role}</div>
                </div>
                <CopyLink
                  url={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`}
                />
                <RevokeForm slug={slug} inviteId={inv.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RoleForm({
  slug,
  memberId,
  role,
}: {
  slug: string;
  memberId: string;
  role: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    changeRoleAction,
    {},
  );
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
        title={state.error ?? undefined}
      >
        <option value="owner">Owner</option>
        <option value="agent">Agent</option>
        <option value="viewer">Viewer</option>
      </select>
    </form>
  );
}

function RemoveForm({ slug, memberId }: { slug: string; memberId: string }) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    removeMemberAction,
    {},
  );
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        title={state.error ?? "Remove member"}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-danger/10 hover:text-danger"
      >
        <X size={15} />
      </button>
    </form>
  );
}

function RevokeForm({ slug, inviteId }: { slug: string; inviteId: string }) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    revokeInviteAction,
    {},
  );
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <button
        type="submit"
        className="text-xs text-muted hover:text-danger"
      >
        Revoke
      </button>
    </form>
  );
}
