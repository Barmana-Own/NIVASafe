import { useEffect, useState } from "react";

export type Organization = { id: string; nameFa: string; nameEn: string; role: string };
export type Session = { accessToken: string; refreshToken: string; user: { id: string; email: string; displayName: string }; organizations: Organization[] };
export type ApiEnvelope<T> = { data: T; meta?: { page: number; limit: number; total: number } };
const API = (import.meta.env.VITE_API_URL ?? "http://localhost:5044/api/v1").replace(/\/+$/, "");

function validSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Session>;
  return typeof item.accessToken === "string" && typeof item.refreshToken === "string" && Array.isArray(item.organizations) && Boolean(item.user);
}

export function clearSession() {
  localStorage.removeItem("nivasafe-session");
  localStorage.removeItem("nivasafe-org");
}

export function getSession() {
  const raw = localStorage.getItem("nivasafe-session");
  let session: Session | null = null;
  try {
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    if (validSession(parsed)) session = parsed; else if (raw) clearSession();
  } catch { clearSession(); }
  const selected = localStorage.getItem("nivasafe-org") ?? "";
  const orgId = session?.organizations.some((org) => org.id === selected) ? selected : session?.organizations?.[0]?.id ?? "";
  if (orgId && orgId !== selected) localStorage.setItem("nivasafe-org", orgId);
  return { session, orgId };
}


export function getCurrentRole() {
  const { session, orgId } = getSession();
  return session?.organizations.find((organization) => organization.id === orgId)?.role ?? "VIEWER";
}

export function hasAnyRole(roles: string[]) {
  return roles.includes(getCurrentRole());
}

export function saveSession(session: Session) {
  localStorage.setItem("nivasafe-session", JSON.stringify(session));
  const current = localStorage.getItem("nivasafe-org");
  localStorage.setItem("nivasafe-org", session.organizations.some((org) => org.id === current) ? current! : session.organizations[0]?.id ?? "");
}

async function parseResponse(response: Response) {
  if (response.status === 204) return { data: null };
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) return response.json();
  const text = await response.text();
  return text ? { data: text } : { data: null };
}

let refreshPromise: Promise<Session> | null = null;
async function refreshSession(session: Session): Promise<Session> {
  refreshPromise ??= (async () => {
    let response: Response;
    try {
      response = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }) });
    } catch { throw new Error("ارتباط با سرور برقرار نشد."); }
    const value = await parseResponse(response) as ApiEnvelope<{ accessToken: string; refreshToken: string }> & { error?: { message?: string } };
    if (!response.ok) throw new Error(value.error?.message ?? "نشست منقضی شده است");
    const next = { ...session, ...value.data };
    saveSession(next);
    return next;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function authHeaders(session: Session | null, orgId: string) {
  return {
    ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}),
    ...(orgId ? { "x-organization-id": orgId } : {}),
  };
}

function expireSession() {
  clearSession();
  if (window.location.pathname !== "/login") window.location.assign("/login");
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  const { session, orgId } = getSession();
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...authHeaders(session, orgId),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("ارتباط با سرور برقرار نشد. مطمئن شوید Backend روی پورت 5044 اجرا شده است.");
  }
  if (response.status === 401 && retry && session?.refreshToken && !path.includes("/auth/refresh")) {
    try { await refreshSession(session); return api<T>(path, options, false); }
    catch { expireSession(); throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید."); }
  }
  const value = await parseResponse(response);
  if (!response.ok) throw new Error((value as { error?: { message?: string } }).error?.message || `خطای سرور (${response.status})`);
  return value as ApiEnvelope<T>;
}

export async function download(path: string, retry = true): Promise<Blob> {
  const { session, orgId } = getSession();
  let response: Response;
  try { response = await fetch(`${API}${path}`, { headers: authHeaders(session, orgId) }); }
  catch { throw new Error("ارتباط با سرور برقرار نشد. مطمئن شوید Backend روی پورت 5044 اجرا شده است."); }
  if (response.status === 401 && retry && session?.refreshToken) {
    try { await refreshSession(session); return download(path, false); }
    catch { expireSession(); throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید."); }
  }
  if (!response.ok) {
    const value = await parseResponse(response);
    throw new Error((value as { error?: { message?: string } }).error?.message ?? "دانلود فایل ناموفق بود");
  }
  return response.blob();
}

export function useLoad<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!path) { setData(null); setLoading(false); setError(""); return; }
    let active = true;
    setLoading(true); setError("");
    api<T>(path).then((result) => active && setData(result.data)).catch((reason) => active && setError(reason instanceof Error ? reason.message : String(reason))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [path, refresh, ...deps]);
  return { data, error, loading, reload: () => setRefresh((value) => value + 1) };
}
