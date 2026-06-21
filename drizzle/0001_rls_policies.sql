-- Custom SQL migration file, put your code below! --
-- ===========================================================================
-- DeskHive row-level security (defence-in-depth tenant isolation)
-- ===========================================================================
-- The application also scopes every query by workspace; these policies are a
-- second, database-enforced layer keyed on the acting Clerk user id, which the
-- data layer pins per transaction via set_config('app.user_id', ...).
--
-- Design notes:
--  * The app connects as the table owner, so RLS only bites when FORCEd. We
--    FORCE the high-value tenant tables. `workspace_members` keeps RLS enabled
--    but unforced so the membership-lookup helper cannot recurse, and is the
--    SECURITY DEFINER source of truth for the other tables' policies.
--  * `audit_logs` gets only SELECT + INSERT policies, so under FORCE RLS even
--    the application role cannot UPDATE or DELETE audit rows (tamper-evident).
-- ---------------------------------------------------------------------------

-- Context helpers -----------------------------------------------------------
create or replace function app_current_user_id() returns text
  language sql stable as $$
    select nullif(current_setting('app.user_id', true), '')
  $$;

create or replace function app_bypass() returns boolean
  language sql stable as $$
    select coalesce(nullif(current_setting('app.bypass_rls', true), ''), 'off') = 'on'
  $$;

-- SECURITY DEFINER: reads workspace_members irrespective of the caller's RLS,
-- which prevents policy recursion on the other tables.
create or replace function app_is_member(ws text) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from workspace_members m
      where m.workspace_id = ws and m.user_id = app_current_user_id()
    )
  $$;

create or replace function app_role(ws text) returns text
  language sql stable security definer set search_path = public as $$
    select m.role::text from workspace_members m
    where m.workspace_id = ws and m.user_id = app_current_user_id()
  $$;

-- workspace_members (RLS enabled, NOT forced — owner is the definer source) ---
alter table workspace_members enable row level security;
drop policy if exists members_rls on workspace_members;
create policy members_rls on workspace_members
  using (app_bypass() or user_id = app_current_user_id() or app_is_member(workspace_id))
  with check (app_bypass() or app_is_member(workspace_id));

-- workspaces ----------------------------------------------------------------
alter table workspaces enable row level security;
alter table workspaces force row level security;
drop policy if exists workspaces_sel on workspaces;
drop policy if exists workspaces_ins on workspaces;
drop policy if exists workspaces_upd on workspaces;
drop policy if exists workspaces_del on workspaces;
create policy workspaces_sel on workspaces for select
  using (app_bypass() or app_is_member(id));
create policy workspaces_ins on workspaces for insert
  with check (app_bypass());
create policy workspaces_upd on workspaces for update
  using (app_bypass() or app_role(id) = 'owner')
  with check (app_bypass() or app_role(id) = 'owner');
create policy workspaces_del on workspaces for delete
  using (app_bypass() or app_role(id) = 'owner');

-- invitations ---------------------------------------------------------------
alter table invitations enable row level security;
alter table invitations force row level security;
drop policy if exists invitations_sel on invitations;
drop policy if exists invitations_mod on invitations;
create policy invitations_sel on invitations for select
  using (app_bypass() or app_is_member(workspace_id));
create policy invitations_mod on invitations for all
  using (app_bypass() or app_role(workspace_id) = 'owner')
  with check (app_bypass() or app_role(workspace_id) = 'owner');

-- tickets -------------------------------------------------------------------
alter table tickets enable row level security;
alter table tickets force row level security;
drop policy if exists tickets_rls on tickets;
create policy tickets_rls on tickets
  using (app_bypass() or app_is_member(workspace_id))
  with check (app_bypass() or app_is_member(workspace_id));

-- ticket_messages -----------------------------------------------------------
alter table ticket_messages enable row level security;
alter table ticket_messages force row level security;
drop policy if exists messages_rls on ticket_messages;
create policy messages_rls on ticket_messages
  using (app_bypass() or app_is_member(workspace_id))
  with check (app_bypass() or app_is_member(workspace_id));

-- audit_logs (append-only & tamper-evident under FORCE: no UPD/DEL policies) -
alter table audit_logs enable row level security;
alter table audit_logs force row level security;
drop policy if exists audit_sel on audit_logs;
drop policy if exists audit_ins on audit_logs;
create policy audit_sel on audit_logs for select
  using (app_bypass() or app_is_member(workspace_id));
create policy audit_ins on audit_logs for insert
  with check (app_bypass() or app_is_member(workspace_id));
