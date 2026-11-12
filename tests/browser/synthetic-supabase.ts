import type { Page, Route } from "@playwright/test";

const API_ROOT = "http://127.0.0.1:4173/_fake_supabase";
const AUTH_STORAGE_KEY = "sb-127-auth-token";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
export const TEST_USERS = { a: USER_A, b: USER_B } as const;

interface MockAppointment {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  appointment_date: string;
  appointment_time: string | null;
  kind: string;
  status: string;
}

function sessionFor(userId: string) {
  // Synthetically signed JWT payload only. Not a production credential.
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: userId, role: "authenticated", aud: "authenticated",
    exp: 4102444800, iat: 1735689600,
  })).toString("base64url");
  const accessToken = header + "." + payload + ".ci-fake-signature";
  const user = {
    id: userId, aud: "authenticated", role: "authenticated",
    email: "synthetic-" + userId.slice(0, 8) + "@example.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {}, created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  return {
    access_token: accessToken, refresh_token: "ci-not-real",
    token_type: "bearer", expires_in: 2400000000, expires_at: 4102444800, user,
  };
}

/** Test-only session, loaded through the same browser localStorage adapter used by Supabase Auth. */
export async function installSyntheticSession(page: Page, userId: string) {
  await page.addInitScript(({ session, key }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(session));
    }
  }, { session: sessionFor(userId), key: AUTH_STORAGE_KEY });
}

export async function swapSyntheticSession(page: Page, userId: string) {
  await page.evaluate(({ session, key }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { session: sessionFor(userId), key: AUTH_STORAGE_KEY });
  await page.reload();
}

function ownerFromRequest(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { sub?: string };
    return json.sub === USER_A || json.sub === USER_B ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * Fake Supabase Auth + REST back end for UI acceptance ONLY.
 * This is not a test of real database RLS or real credentials.
 */
export function createSyntheticSupabaseApi() {
  const rows = new Map<string, MockAppointment>();
  let nextId = 1;
  let failWrites = false;
  const operations: string[] = [];

  async function serve(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.href.startsWith(API_ROOT + "/")) return route.continue();
    const common = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,apikey,content-type,prefer,range,x-client-info",
      "content-type": "application/json",
    };
    const fulfill = (status: number, body: unknown) =>
      route.fulfill({ status, headers: common, body: JSON.stringify(body) });
    const method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: common, body: "" });

    const owner = ownerFromRequest(request.headers()["authorization"]);
    if (url.pathname.startsWith("/_fake_supabase/auth/v1/user")) {
      const user = owner ? sessionFor(owner).user : null;
      return fulfill(owner ? 200 : 401, user ?? { msg: "Not authenticated" });
    }
    if (url.pathname.startsWith("/_fake_supabase/auth/v1/")) {
      return fulfill(401, { msg: "Unmocked auth request; no real auth is used" });
    }
    if (!url.pathname.startsWith("/_fake_supabase/rest/v1/")) return fulfill(404, {});
    if (!owner) return fulfill(401, { code: "PGRST301", message: "No synthetic user" });

    const name = url.pathname.slice("/_fake_supabase/rest/v1/".length);
    if (name === "profiles" || name === "pregnancy_tracking" || name === "pregnancy_daily_entries") {
      return fulfill(200, []);
    }
    if (name !== "pregnancy_appointments") return fulfill(200, []);

    operations.push(method + " " + url.pathname);
    if (failWrites && method !== "GET") {
      return fulfill(503, { code: "PGRST503", message: "Synthetic network outage" });
    }

    const eqOwner = url.searchParams.get("user_id");
    if (eqOwner && eqOwner !== "eq." + owner) return fulfill(200, []);

    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const filtered = [...rows.values()].filter((r) =>
      r.user_id === owner &&
      (!id || r.id === id) &&
      (!url.searchParams.get("status") || url.searchParams.get("status") === "eq." + r.status) &&
      (!url.searchParams.get("appointment_date") ||
        (url.searchParams.get("appointment_date")!.startsWith("gte.") ?
          r.appointment_date >= url.searchParams.get("appointment_date")!.slice(4) : true)));

    filtered.sort((a, b) =>
      a.appointment_date.localeCompare(b.appointment_date) ||
      (a.appointment_time ?? "").localeCompare(b.appointment_time ?? "") ||
      a.id.localeCompare(b.id));

    if (method === "GET") {
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number(url.searchParams.get("limit") ?? "200");
      const selection = filtered.slice(offset, offset + limit).map((r) => ({ ...r }));
      if (request.headers()["accept"]?.includes("application/vnd.pgrst.object")) {
        return selection.length ? fulfill(200, selection[0]) : fulfill(406, { code: "PGRST116", message: "No rows" });
      }
      return fulfill(200, selection);
    }

    let body: Record<string, unknown>;
    try {
      body = request.postDataJSON() as Record<string, unknown>;
    } catch {
      return fulfill(400, { code: "PGRST400", message: "Invalid test payload" });
    }

    if (method === "POST") {
      if (body.user_id !== owner) return fulfill(403, { code: "42501", message: "Not owner" });
      const newRow: MockAppointment = {
        id: "00000000-0000-4000-8000-" + String(nextId++).padStart(12, "0"),
        user_id: owner, title: String(body.title ?? ""), notes: String(body.notes ?? ""),
        appointment_date: String(body.appointment_date ?? ""),
        appointment_time: (body.appointment_time as string | null) ?? null,
        kind: String(body.kind ?? "visit"), status: "planned",
      };
      rows.set(newRow.id, newRow);
      return fulfill(201, newRow);
    }
    if (method === "PATCH") {
      if (!id) return fulfill(403, { code: "42501", message: "Missing id" });
      const current = rows.get(id);
      if (!current || current.user_id !== owner) return fulfill(406, { code: "PGRST116", message: "No rows" });
      Object.assign(current, body);
      return fulfill(200, current);
    }
    if (method === "DELETE") {
      if (!id) return fulfill(403, { code: "42501", message: "Missing id" });
      const current = rows.get(id);
      if (!current || current.user_id !== owner) return fulfill(406, { code: "PGRST116", message: "No rows" });
      rows.delete(id);
      return fulfill(200, { id });
    }
    return fulfill(405, { code: "PGRST405", message: "Unsupported test request" });
  }

  return { serve, rows, operations, setWriteFailure: (value: boolean) => { failWrites = value; } };
}
