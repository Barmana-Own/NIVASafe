import { useEffect, useRef, useState } from "react";
import { api, type Locale } from "../../api/client";
import { useI18n } from "../../i18n";
import type { FmeaReportActionSuggestion } from "./fmeaReportCollections";

type Response = { suggestions: FmeaReportActionSuggestion[]; aiStatus: "connected" | "fallback" | "unavailable" };
type Result = { key: string; suggestions: FmeaReportActionSuggestion[] | null; loading: boolean; error: string };

/** One request per report/language visit. Re-renders and report reloads share it;
 * failures require an explicit retry. Nothing is cached in browser storage. */
export function useFmeaAutomaticSuggestions(id: string | undefined, locale: Locale, enabled: boolean) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const key = enabled && id ? `${id}:${locale}:${attempt}` : "";
  const resource = useRef<{ key: string; controller: AbortController; promise: Promise<Response> } | null>(null);
  const [result, setResult] = useState<Result>({ key: "", suggestions: null, loading: false, error: "" });

  useEffect(() => {
    if (!key || !id) return;
    let active = true;
    // Deferral lets StrictMode cancel its first setup before any paid request.
    const timer = window.setTimeout(() => {
      if (resource.current?.key !== key) {
        resource.current?.controller.abort();
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 90_000);
        const promise = api<Response>(`/fmea/${encodeURIComponent(id)}/report/action-suggestions`, {
          method: "POST", body: JSON.stringify({ locale, excludeTitles: [] }), signal: controller.signal,
        }).then(response => response.data).finally(() => window.clearTimeout(timeout));
        resource.current = { key, controller, promise };
      }
      setResult({ key, suggestions: null, loading: true, error: "" });
      void resource.current.promise.then(response => {
        if (!active) return;
        setResult({ key, suggestions: response.suggestions, loading: false, error: response.aiStatus === "connected" ? "" : t("report.aiActionsUnavailable") });
      }).catch((reason: unknown) => {
        if (!active) return;
        setResult({ key, suggestions: null, loading: false, error: reason instanceof Error ? reason.message : t("report.aiActionsUnavailable") });
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key]);

  useEffect(() => () => resource.current?.controller.abort(), []);

  const current = result.key === key ? result : { suggestions: null, loading: Boolean(key), error: "" };
  return { ...current, retry: () => { if (enabled && !current.loading) setAttempt(value => value + 1); } };
}
