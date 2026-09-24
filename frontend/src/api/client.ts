import { useEffect, useState } from "react";

export type Locale = "fa" | "en";
export type Organization = { id: string; nameFa: string; nameEn: string; role: string; active?: boolean; subscriptionPlan?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | null; subscriptionPaymentRequired?: boolean };
export type Session = { accessToken: string; refreshToken: string; user: { id: string; email: string; displayName: string; locale?: string; globalRole?: string }; organizations: Organization[] };
export type ApiEnvelope<T> = { data: T; meta?: { page: number; limit: number; total: number } };
export type ApiError = Error & { code?: string; requestId?: string; status?: number };
// Vite can load the repository's development `.env` while producing a
// production bundle. Use the build mode rather than NODE_ENV so a local API
// URL can never leak into a production deployment by accident.
const productionBuild = import.meta.env.MODE === "production";
const defaultApiUrl = productionBuild ? "/api/v1" : "http://localhost:5044/api/v1";
const configuredApiUrl = import.meta.env.VITE_API_URL;
const localDevelopmentApiUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/;
const apiUrl = productionBuild && configuredApiUrl && localDevelopmentApiUrl.test(configuredApiUrl) ? defaultApiUrl : configuredApiUrl ?? defaultApiUrl;
const API = apiUrl.replace(/\/+$/, "");
const SESSION_KEY = "nivasafe-session";
const ORG_KEY = "nivasafe-org";
export const ASSESSMENT_PATH_KEY = "nivasafe-path-selected";

export function getCurrentLocale(): Locale {
  return localStorage.getItem("nivasafe-locale") === "en" ? "en" : "fa";
}

function localizedMessage(persian: string, english: string) {
  return getCurrentLocale() === "en" ? english : persian;
}

export function directionForLocale(locale: string = getCurrentLocale()): "ltr" | "rtl" {
  return locale === "en" ? "ltr" : "rtl";
}

function validSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Session>;
  return typeof item.accessToken === "string" && typeof item.refreshToken === "string" && Array.isArray(item.organizations) && Boolean(item.user);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ORG_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ORG_KEY);
  sessionStorage.removeItem(ASSESSMENT_PATH_KEY);
}

export function isSessionRemembered() {
  return Boolean(localStorage.getItem(SESSION_KEY));
}

export function getSession() {
  const read = (storage: Storage) => {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (validSession(parsed)) return parsed;
    } catch { /* fall through and remove malformed state */ }
    storage.removeItem(SESSION_KEY);
    return null;
  };
  const session = read(localStorage) ?? read(sessionStorage);
  const selected = localStorage.getItem(ORG_KEY) ?? sessionStorage.getItem(ORG_KEY) ?? "";
  const orgId = session?.organizations.some((org) => org.id === selected) ? selected : session?.organizations?.[0]?.id ?? "";
  if (orgId && orgId !== selected) localStorage.setItem(ORG_KEY, orgId);
  return { session, orgId };
}


export function getCurrentRole() {
  const { session, orgId } = getSession();
  if (session?.user.globalRole === "SUPER_ADMIN") return "SUPER_ADMIN";
  return session?.organizations.find((organization) => organization.id === orgId)?.role ?? "VIEWER";
}

export function hasAnyRole(roles: string[]) {
  return roles.includes(getCurrentRole());
}

export function saveSession(session: Session, remember = true, selectedOrganizationId?: string) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  target.setItem(SESSION_KEY, JSON.stringify(session));
  other.removeItem(SESSION_KEY);
  const current = selectedOrganizationId ?? localStorage.getItem(ORG_KEY) ?? sessionStorage.getItem(ORG_KEY) ?? "";
  const selected = session.organizations.some((org) => org.id === current) ? current : session.organizations[0]?.id ?? "";
  target.setItem(ORG_KEY, selected);
  other.removeItem(ORG_KEY);
  if (session.user.locale === "en" || session.user.locale === "fa") localStorage.setItem("nivasafe-locale", session.user.locale);
}

export function selectOrganization(organizationId: string): boolean {
  const { session } = getSession();
  if (!session?.organizations.some((organization) => organization.id === organizationId)) return false;
  saveSession(session, isSessionRemembered(), organizationId);
  return true;
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
    } catch { throw new Error(localizedMessage("ارتباط با سرور برقرار نشد.", "Unable to connect to the server.")); }
    const value = await parseResponse(response) as ApiEnvelope<{ accessToken: string; refreshToken: string }> & { error?: { message?: string } };
    if (!response.ok) throw new Error(value.error?.message ?? localizedMessage("نشست منقضی شده است", "Your session has expired."));
    const next = { ...session, ...value.data };
    saveSession(next, isSessionRemembered());
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
  const hasBody = options.body !== undefined && options.body !== null;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(hasBody && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
        ...authHeaders(session, orgId),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(localizedMessage("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "Unable to connect to the server. Please try again."));
  }
  if (response.status === 401 && retry && session?.refreshToken && !path.includes("/auth/refresh")) {
    try { await refreshSession(session); return api<T>(path, options, false); }
    catch { expireSession(); throw new Error(localizedMessage("نشست شما منقضی شده است؛ دوباره وارد شوید.", "Your session expired. Please sign in again.")); }
  }
  const value = await parseResponse(response);
  if (!response.ok) {
    const details = (value as { error?: { code?: string; message?: string; requestId?: string } }).error;
    const error = new Error(details?.message || localizedMessage(`خطای سرور (${response.status})`, `Server error (${response.status})`)) as ApiError;
    error.code = details?.code;
    error.requestId = details?.requestId;
    error.status = response.status;
    throw error;
  }
  return value as ApiEnvelope<T>;
}

export async function download(path: string, retry = true): Promise<Blob> {
  const { session, orgId } = getSession();
  let response: Response;
  try { response = await fetch(`${API}${path}`, { headers: authHeaders(session, orgId) }); }
  catch { throw new Error(localizedMessage("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "Unable to connect to the server. Please try again.")); }
  if (response.status === 401 && retry && session?.refreshToken) {
    try { await refreshSession(session); return download(path, false); }
    catch { expireSession(); throw new Error(localizedMessage("نشست شما منقضی شده است؛ دوباره وارد شوید.", "Your session expired. Please sign in again.")); }
  }
  if (!response.ok) {
    const value = await parseResponse(response);
    throw new Error((value as { error?: { message?: string } }).error?.message ?? localizedMessage("دانلود فایل ناموفق بود", "File download failed"));
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
