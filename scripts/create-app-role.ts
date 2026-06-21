/**
 * Creates the non-privileged `deskhive_app` runtime role (NOBYPASSRLS) so that
 * RLS is actually enforced at runtime. Owner connection (DIRECT_URL) is used.
 * Password is supplied via APP_DB_PASSWORD env var and never logged.
 * Idempotent.
 */
import { Client } from "pg";

async function main() {
  const owner = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const pw = process.env.APP_DB_PASSWORD;
  if (!owner) throw new Error("DIRECT_URL not set");
  if (!pw) throw new Error("APP_DB_PASSWORD not set");

  // Password is generated as hex (openssl rand -hex), so it is safe to inline.
  if (!/^[0-9a-f]+$/.test(pw)) throw new Error("APP_DB_PASSWORD must be hex");

  const c = new Client({ connectionString: owner });
  await c.connect();
  const exists = await c.query(
    `select 1 from pg_roles where rolname = 'deskhive_app'`,
  );
  const verb = exists.rowCount ? "alter" : "create";
  await c.query(`${verb} role deskhive_app login password '${pw}' nobypassrls`);
  await c.query(`grant usage on schema public to deskhive_app`);
  await c.query(
    `grant select, insert, update, delete on all tables in schema public to deskhive_app`,
  );
  await c.query(
    `grant usage, select on all sequences in schema public to deskhive_app`,
  );
  await c.query(
    `alter default privileges in schema public grant select, insert, update, delete on tables to deskhive_app`,
  );
  await c.query(
    `alter default privileges in schema public grant usage, select on sequences to deskhive_app`,
  );
  await c.end();
  console.log("deskhive_app role ready (NOBYPASSRLS, DML granted)");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
