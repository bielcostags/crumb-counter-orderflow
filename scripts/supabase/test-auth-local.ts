/** LOCAL integration only. CLI credentials stay in memory; only sanitized check names are printed. */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createCookieAuthClient } from "../../src/services/auth/cookie-client.server";
import { authConfiguration } from "../../src/services/auth/config";
import { resolveStaffSession, requireStaff } from "../../src/services/auth/authorization";
const status = JSON.parse(
  execFileSync("bunx", ["--no-install", "supabase", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
assert.equal(status.API_URL, "http://127.0.0.1:54321", "Only loopback stack may be used");
assert.equal(typeof status.ANON_KEY, "string");
assert.equal(typeof status.SERVICE_ROLE_KEY, "string");
const localConfig = authConfiguration({
  AUTH_MODE: "supabase",
  VITE_AUTH_MODE: "supabase",
  AUTH_TARGET: "local",
  SUPABASE_URL: status.API_URL,
  SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
});
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const created: string[] = [];
let checks = 0;
function pass(label: string) {
  checks++;
  console.info(`PASS local: ${label}`);
}
function sql(query: string) {
  return execFileSync(
    "/Applications/Docker.app/Contents/Resources/bin/docker",
    [
      "exec",
      "-i",
      "supabase_db_vila-rica-dev",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}
function client() {
  const jar = new Map<string, string>();
  const sdk = createCookieAuthClient(localConfig, {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (values) => {
      for (const c of values) {
        if (c.options.maxAge === 0) jar.delete(c.name);
        else jar.set(c.name, c.value);
      }
    },
  });
  return { sdk, jar };
}
try {
  const password = `Local-test-${randomUUID()}!`;
  const people = [];
  for (let i = 0; i < 5; i++) {
    const email = `vr63-${randomUUID()}@example.invalid`;
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    assert.ok(result.data.user && !result.error, "Local fixture identity creation failed");
    created.push(result.data.user.id);
    people.push({ id: result.data.user.id, email });
  }
  // Owner fixture preparation only, precisely the five new UUIDs. Restore gate in same transaction.
  sql(`begin; alter table public.profiles disable trigger foundation_block_write;
 insert into public.profiles(id,full_name,role,active) values
 ('${people[0]!.id}','Admin local A','admin',true),('${people[1]!.id}','Admin local B','admin',true),
 ('${people[2]!.id}','Atendente local','atendente',true),('${people[3]!.id}','Inativo local','admin',false);
 alter table public.profiles enable always trigger foundation_block_write; commit;`);
  const anonymous = client();
  assert.equal((await resolveStaffSession(anonymous.sdk)).status, "signed-out");
  pass("unauthenticated denied");
  const invalid = await anonymous.sdk.auth.signInWithPassword({
    email: people[0]!.email,
    password: "not-the-password",
  });
  assert.ok(invalid.error);
  pass("invalid login rejected by real local Auth");
  const sessions: ReturnType<typeof client>[] = [];
  for (const person of people) {
    const c = client();
    const result = await c.sdk.auth.signInWithPassword({ email: person.email, password });
    assert.equal(result.error, null);
    sessions.push(c);
  }
  assert.equal((await requireStaff(sessions[0]!.sdk, "staff")).role, "admin");
  pass("real Auth login + database admin resolution");
  assert.equal((await requireStaff(sessions[2]!.sdk)).role, "atendente");
  await assert.rejects(() => requireStaff(sessions[2]!.sdk, "staff"));
  pass("attendant authorized operationally, denied staff management");
  assert.equal((await resolveStaffSession(sessions[3]!.sdk)).status, "denied");
  pass("inactive profile rejected");
  assert.equal((await resolveStaffSession(sessions[4]!.sdk)).status, "denied");
  pass("missing profile rejected despite forged admin metadata");
  const fresh = createCookieAuthClient(localConfig, {
    getAll: () => [...sessions[0]!.jar].map(([name, value]) => ({ name, value })),
    setAll: (values) => {
      for (const c of values) sessions[0]!.jar.set(c.name, c.value);
    },
  });
  assert.equal((await requireStaff(fresh, "staff")).id, people[0]!.id);
  pass("request-scoped cookie session recovered");
  const refresh = await fresh.auth.refreshSession();
  assert.equal(refresh.error, null);
  assert.equal((await requireStaff(fresh, "staff")).id, people[0]!.id);
  pass("local refresh and cookie renewal");
  const denied = await sessions[2]!.sdk.rpc("manage_staff_profile", {
    target_id: people[2]!.id,
    target_name: "Forged admin",
    target_role: "admin",
    target_active: true,
  });
  assert.ok(denied.error);
  pass("self-promotion rejected by real PostgreSQL RPC");
  // Concurrent opposing admin deactivations: transaction lock leaves exactly one active fixture admin.
  const outcomes = await Promise.all([
    sessions[0]!.sdk.rpc("manage_staff_profile", {
      target_id: people[1]!.id,
      target_name: "Admin local B",
      target_role: "admin",
      target_active: false,
    }),
    sessions[1]!.sdk.rpc("manage_staff_profile", {
      target_id: people[0]!.id,
      target_name: "Admin local A",
      target_role: "admin",
      target_active: false,
    }),
  ]);
  assert.equal(outcomes.filter((x) => !x.error).length, 1);
  pass("concurrent deactivation cannot remove both administrators");
  const remaining = Number(
    sql(
      `select count(*) from public.profiles where id in ('${people[0]!.id}','${people[1]!.id}') and active and role='admin';`,
    ).trim(),
  );
  assert.equal(remaining, 1);
  pass("one active administrator remains after race");
  await sessions[2]!.sdk.auth.signOut({ scope: "local" });
  assert.equal((await resolveStaffSession(sessions[2]!.sdk)).status, "signed-out");
  pass("real logout clears local Auth identity");
  console.info(`Local Auth integration: ${checks} checks passed. No remote project used.`);
} finally {
  if (created.length) {
    const ids = created.map((id) => `'${id}'`).join(",");
    sql(`begin; alter table private.staff_access_audit disable trigger staff_audit_immutable;
  delete from private.staff_access_audit where target_id in (${ids}) or actor_id in (${ids});
  alter table private.staff_access_audit enable always trigger staff_audit_immutable;
  alter table public.profiles disable trigger foundation_block_write; delete from public.profiles where id in (${ids});
  alter table public.profiles enable always trigger foundation_block_write; commit;`);
    for (const id of created) {
      const result = await admin.auth.admin.deleteUser(id);
      assert.equal(result.error, null, "Local fixture cleanup failed");
    }
    console.info("Local fixtures created by this execution cleaned; original records preserved.");
  }
}
