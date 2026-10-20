import { useEffect, useState } from "react";
import { accessTokenNeedsRefresh } from "./sessionRefresh";

export type Locale = "fa" | "en";
export type Organization = { id: string; nameFa: string; nameEn: string; role: string; active?: boolean; subscriptionPlan?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | null; subscriptionPaymentRequired?: boolean };
export type Session = { accessToken: string; refreshToken: string; user: { id: string; email: string; username?: string | null; displayName: string; locale?: string; globalRole?: string }; organizations: Organization[] };
export type ApiEnvelope<T> = { data: T; meta?: { page: number; limit: number; total: number } };
export type ApiError = Error & { code?: string; requestId?: string; status?: number; retryable?: boolean };
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

let refreshOperation: { token: string; userId: string; promise: Promise<Session> } | null = null;
function contextChanged(): ApiError {
  return Object.assign(new Error(localizedMessage("نشست یا سازمان تغییر کرده است؛ دوباره تلاش کنید.", "The session or workspace changed. Please try again.")), { code: "REQUEST_CONTEXT_CHANGED", status: 409, retryable: false });
}

async function refreshSession(session: Session): Promise<Session> {
  if (refreshOperation?.token === session.refreshToken && refreshOperation.userId === session.user.id) return refreshOperation.promise;
  const renew = async () => {
    const current = getSession().session;
    if (!current || current.user.id !== session.user.id) throw contextChanged();
    // Another request or tab may already have rotated this refresh token.
    if (current.accessToken !== session.accessToken || current.refreshToken !== session.refreshToken) return current;
    let response: Response;
    try {
      response = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }), signal: AbortSignal.timeout(15_000) });
    } catch { throw Object.assign(new Error(localizedMessage("ارتباط با سرور برقرار نشد.", "Unable to connect to the server.")), { code: "NETWORK_ERROR", retryable: true }); }
    const value = await parseResponse(response) as ApiEnvelope<{ accessToken: string; refreshToken: string }> & { error?: { code?: string; message?: string } };
    if (!response.ok) throw Object.assign(new Error(value.error?.message ?? localizedMessage("نشست منقضی شده است", "Your session has expired.")), { code: value.error?.code ?? "SESSION_REFRESH_FAILED", status: response.status, retryable: response.status === 429 || response.status >= 500 });
    if (!value.data?.accessToken || typeof value.data.accessToken !== "string" || !value.data.refreshToken || typeof value.data.refreshToken !== "string") throw Object.assign(new Error(localizedMessage("پاسخ تمدید نشست معتبر نیست.", "Invalid session renewal response.")), { code: "INVALID_REFRESH_RESPONSE", status: 502 });
    const latest = getSession().session;
    if (!latest || latest.user.id !== session.user.id) throw contextChanged();
    if (latest.refreshToken !== session.refreshToken || latest.accessToken !== session.accessToken) return latest;
    const next = { ...session, ...value.data };
    saveSession(next, isSessionRemembered());
    return next;
  };
  // Web Locks serialize rotations across same-origin tabs; older browsers keep
  // the in-tab single-flight path. No credential is used in the lock name.
  const operation: Promise<Session> = Promise.resolve(typeof navigator !== "undefined" && navigator.locks?.request
    ? navigator.locks.request("nivasafe-session-refresh", renew) : renew());
  const promise = operation.finally(() => { if (refreshOperation?.promise === promise) refreshOperation = null; });
  refreshOperation = { token: session.refreshToken, userId: session.user.id, promise };
  return promise;
}

async function requestSession(session: Session, orgId: string, force = false): Promise<Session> {
  const current = getSession();
  if (!current.session || current.session.user.id !== session.user.id || current.orgId !== orgId) throw contextChanged();
  const changed = current.session.accessToken !== session.accessToken || current.session.refreshToken !== session.refreshToken;
  const next = !changed && (force || accessTokenNeedsRefresh(session.accessToken)) ? await refreshSession(session) : current.session;
  const latest = getSession();
  if (!latest.session || latest.session.user.id !== session.user.id || latest.orgId !== orgId) throw contextChanged();
  return next;
}

function renewalFailed(reason: unknown, session: Session): never {
  const error = reason as ApiError;
  const current = getSession().session;
  if ((error?.status === 401 || error?.status === 403) && current?.user.id === session.user.id && current.refreshToken === session.refreshToken) {
    expireSession();
    throw Object.assign(new Error(localizedMessage("نشست شما منقضی شده است؛ دوباره وارد شوید.", "Your session expired. Please sign in again.")), { code: "SESSION_EXPIRED", status: 401 });
  }
  throw reason;
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
  const { session: initialSession, orgId } = getSession();
  const renewable = !/^\/auth\/(?:login|register|refresh|forgot-password|reset-password)(?:[/?]|$)/.test(path);
  let session = initialSession;
  if (renewable && session) {
    try { session = await requestSession(session, orgId); }
    catch (reason) { renewalFailed(reason, session); }
  }
  let response: Response;
  const hasBody = options.body !== undefined && options.body !== null;
  try {
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...(hasBody && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
        ...authHeaders(session, orgId),
        ...options.headers,
      },
    };
    if (!hasBody && !options.cache) requestOptions.cache = "no-store";
    response = await fetch(`${API}${path}`, requestOptions);
  } catch {
    const error = new Error(localizedMessage("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "Unable to connect to the server. Please try again.")) as ApiError;
    error.code = "NETWORK_ERROR";
    throw error;
  }
  if (response.status === 401 && retry && session?.refreshToken && renewable) {
    try { await requestSession(session, orgId, true); return api<T>(path, options, false); }
    catch (reason) { renewalFailed(reason, session); }
  }
  const value = await parseResponse(response);
  const quotaRelevantPost = (options.method ?? "GET").toUpperCase() === "POST" && /^\/(?:assistant|fmea|rula)(?:\/|$)/.test(path);
  if (quotaRelevantPost && (response.ok || response.status === 429) && typeof window !== "undefined") window.dispatchEvent(new Event("nivasafe-ai-quota-changed"));
  if (!response.ok) {
    const details = (value as { error?: { code?: string; message?: string; requestId?: string; retryable?: boolean } }).error;
    const error = new Error(details?.message || localizedMessage(`خطای سرور (${response.status})`, `Server error (${response.status})`)) as ApiError;
    error.code = details?.code;
    error.requestId = details?.requestId;
    error.status = response.status;
    if (typeof details?.retryable === "boolean") error.retryable = details.retryable;
    throw error;
  }
  return value as ApiEnvelope<T>;
}

export async function download(path: string, retry = true): Promise<Blob> {
  const { session: initialSession, orgId } = getSession();
  let session = initialSession;
  if (session) {
    try { session = await requestSession(session, orgId); }
    catch (reason) { renewalFailed(reason, session); }
  }
  let response: Response;
  try { response = await fetch(`${API}${path}`, { headers: authHeaders(session, orgId) }); }
  catch { throw new Error(localizedMessage("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "Unable to connect to the server. Please try again.")); }
  if (response.status === 401 && retry && session?.refreshToken) {
    try { await requestSession(session, orgId, true); return download(path, false); }
    catch (reason) { renewalFailed(reason, session); }
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
