import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { EmptyState, Icon, LoadingState } from "./UI";

type ResourceState<T> = { data: T | null; error: string; loading: boolean; reload: () => void };

/** Shared data feedback without importing an unrelated feature's page bundle. */
export function LoadState<T>({ state, children, empty }: { state: ResourceState<T>; children: (data: T) => ReactNode; empty?: string }) {
  const { t } = useI18n();
  if (state.loading) return <LoadingState/>;
  if (state.error) return <div className="state error-state" role="alert"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>{t("common.loadFailed")}</h3><p>{state.error}</p><button type="button" className="primary" onClick={state.reload}>{t("common.retry")}</button></div>;
  if (!state.data || (Array.isArray(state.data) && !state.data.length)) return <EmptyState title={empty ?? t("common.dataNotRegistered")} icon="folder"/>;
  return <>{children(state.data)}</>;
}
