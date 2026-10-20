import { Component, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { EmptyState } from "./UI";

export function RouteLoadFailure() {
  const { t } = useI18n();
  return <main className="route-recovery" tabIndex={-1}>
    <EmptyState icon="warning" title={t("redesign.routeLoadError")} description={t("redesign.routeLoadErrorDescription")}
      action={<button type="button" className="primary" onClick={() => window.location.reload()}>{t("common.retry")}</button>} />
  </main>;
}

export class RouteRecovery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <RouteLoadFailure /> : this.props.children; }
}
