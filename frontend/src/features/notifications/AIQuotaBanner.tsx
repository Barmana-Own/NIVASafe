import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api, useLoad } from "../../api/client";
import { Icon } from "../../components/UI";
import { useI18n } from "../../i18n";

export type AIQuotaStatus = {
  tokenLimit: number;
  tokensUsed: number;
  remainingTokens: number;
  warningThreshold: number;
  state: "HEALTHY" | "LOW" | "EXHAUSTED" | "DISABLED";
  serverTimestamp: string;
};

export function isAIQuotaStatus(value: unknown): value is AIQuotaStatus {
  if (!value || typeof value !== "object") return false;
  const quota = value as Partial<AIQuotaStatus>;
  return Number.isFinite(quota.tokenLimit)
    && Number.isFinite(quota.tokensUsed)
    && Number.isFinite(quota.remainingTokens)
    && Number.isFinite(quota.warningThreshold)
    && (quota.state === "HEALTHY" || quota.state === "LOW" || quota.state === "EXHAUSTED" || quota.state === "DISABLED")
    && typeof quota.serverTimestamp === "string";
}

export const AI_QUOTA_CHANGED = "nivasafe-ai-quota-changed";
export function notifyAIQuotaChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_QUOTA_CHANGED));
}

export function AIQuotaBanner() {
  const { locale, t } = useI18n();
  const state = useLoad<AIQuotaStatus>("/me/ai-quota");
  const reload = useRef(state.reload);
  reload.current = state.reload;

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reload.current(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(AI_QUOTA_CHANGED, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(AI_QUOTA_CHANGED, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const quota = state.data;
  if (state.error || !isAIQuotaStatus(quota) || quota.state === "HEALTHY") return null;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const remaining = quota.remainingTokens.toLocaleString(numberLocale);
  const stateLabel = quota.state === "LOW" ? t("quota.lowTitle") : quota.state === "EXHAUSTED" ? t("quota.exhaustedTitle") : t("quota.disabledTitle");
  const details = quota.state === "LOW"
    ? t("quota.lowDescription", { remaining })
    : quota.state === "EXHAUSTED" ? t("quota.exhaustedDescription") : t("quota.disabledDescription");

  return <aside className={`ai-quota-banner state-${quota.state.toLowerCase()}`} data-testid="ai-quota-banner" data-state={quota.state} role="status" aria-live="polite">
    <span className="ai-quota-banner-icon"><Icon name={quota.state === "DISABLED" ? "shield" : "assistant"} size={19}/></span>
    <div className="ai-quota-banner-copy"><strong>{stateLabel}</strong><span>{details}</span></div>
    <Link className="ai-quota-banner-link" to="/support?category=AI_QUOTA">{t("quota.contactSupport")}<Icon name="arrow" size={14}/></Link>
  </aside>;
}

export async function refreshAIQuotaAfterRequest<T>(path: string, options: RequestInit = {}) {
  const result = await api<T>(path, options);
  if ((options.method ?? "GET").toUpperCase() === "POST") notifyAIQuotaChanged();
  return result;
}
