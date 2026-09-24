import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../components/UI";
import { useI18n } from "../i18n";

type InstallOutcome = "accepted" | "dismissed";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
};
type StandaloneNavigator = Navigator & { standalone?: boolean };

const INSTALL_DISMISSED_KEY = "nivasafe-pwa-install-dismissed";
const INSTALL_DISMISS_TTL = 14 * 24 * 60 * 60 * 1000;
const UPDATE_CHECK_INTERVAL = 15 * 60 * 1000;
const UPDATE_RELOAD_TIMEOUT = 12 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as StandaloneNavigator).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function canShowInstallHint() {
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY));
    return !dismissedAt || Date.now() - dismissedAt > INSTALL_DISMISS_TTL;
  } catch {
    return true;
  }
}

function rememberInstallDismissal() {
  try { localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now())); } catch { /* Private browsing can block storage. */ }
}

export function PwaManager() {
  const { t } = useI18n();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(true);
  const [updateBusy, setUpdateBusy] = useState(false);
  const refreshing = useRef(false);
  const reloadFallback = useRef<number | null>(null);
  const dismissedWaitingWorker = useRef<ServiceWorker | null>(null);
  const ios = isIos();

  const clearReloadFallback = useCallback(() => {
    if (reloadFallback.current !== null) {
      window.clearTimeout(reloadFallback.current);
      reloadFallback.current = null;
    }
  }, []);

  useEffect(() => {
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const legacyMedia = standaloneMedia as unknown as {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };
    const syncInstalledState = () => setInstalled(isStandalone());
    const onDisplayModeChange = () => syncInstalledState();
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandalone()) return;
      const prompt = event as BeforeInstallPromptEvent;
      setInstallPrompt(prompt);
      if (canShowInstallHint()) setInstallVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallVisible(false);
      try { localStorage.removeItem(INSTALL_DISMISSED_KEY); } catch { /* Ignore unavailable storage. */ }
    };

    syncInstalledState();
    if (isIos() && !isStandalone() && canShowInstallHint()) setInstallVisible(true);
    if (typeof standaloneMedia.addEventListener === "function") standaloneMedia.addEventListener("change", onDisplayModeChange);
    else legacyMedia.addListener?.(onDisplayModeChange);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      if (typeof standaloneMedia.removeEventListener === "function") standaloneMedia.removeEventListener("change", onDisplayModeChange);
      else legacyMedia.removeListener?.(onDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    let watchedWorker: ServiceWorker | null = null;
    let installingStateChange: (() => void) | null = null;
    let updateTimer: number | null = null;

    const markWaiting = () => {
      const waiting = currentRegistration?.waiting;
      if (!active || !waiting || !navigator.serviceWorker.controller) {
        if (active && !waiting) setUpdateReady(false);
        return;
      }
      setUpdateReady(true);
      if (dismissedWaitingWorker.current !== waiting) setUpdateVisible(true);
    };

    const stopWatchingInstalling = () => {
      if (watchedWorker && installingStateChange) watchedWorker.removeEventListener("statechange", installingStateChange);
      watchedWorker = null;
      installingStateChange = null;
    };

    const watchInstalling = () => {
      stopWatchingInstalling();
      const worker = currentRegistration?.installing;
      if (!worker) {
        markWaiting();
        return;
      }
      const onStateChange = () => {
        if (worker.state === "installed" || worker.state === "activated") markWaiting();
      };
      watchedWorker = worker;
      installingStateChange = onStateChange;
      worker.addEventListener("statechange", onStateChange);
    };

    const checkForUpdate = () => {
      if (active) void currentRegistration?.update().catch(() => undefined);
    };

    const onControllerChange = () => {
      if (!refreshing.current) {
        markWaiting();
        return;
      }
      refreshing.current = false;
      setUpdateBusy(false);
      setUpdateReady(false);
      clearReloadFallback();
      window.location.reload();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    const onPageShow = () => checkForUpdate();
    const onOnline = () => checkForUpdate();

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((value) => {
      if (!active) return;
      currentRegistration = value;
      setRegistration(value);
      value.addEventListener("updatefound", watchInstalling);
      watchInstalling();
      markWaiting();
      checkForUpdate();
      updateTimer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
    }).catch(() => undefined);

    return () => {
      active = false;
      if (updateTimer !== null) window.clearInterval(updateTimer);
      stopWatchingInstalling();
      currentRegistration?.removeEventListener("updatefound", watchInstalling);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
      clearReloadFallback();
    };
  }, [clearReloadFallback]);

  const dismissInstall = useCallback(() => {
    rememberInstallDismissal();
    setInstallVisible(false);
  }, []);

  async function install() {
    if (!installPrompt || installBusy) return;
    setInstallBusy(true);
    const prompt = installPrompt;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      else rememberInstallDismissal();
    } catch {
      // The browser can withdraw the prompt when the page loses focus.
    } finally {
      setInstallPrompt(null);
      setInstallVisible(false);
      setInstallBusy(false);
    }
  }

  function dismissUpdate() {
    dismissedWaitingWorker.current = registration?.waiting ?? null;
    setUpdateVisible(false);
  }

  function applyUpdate() {
    if (updateBusy) return;
    const waiting = registration?.waiting;
    if (!waiting) {
      setUpdateReady(false);
      return;
    }
    dismissedWaitingWorker.current = null;
    refreshing.current = true;
    setUpdateBusy(true);
    try {
      waiting.postMessage({ type: "SKIP_WAITING" });
      clearReloadFallback();
      reloadFallback.current = window.setTimeout(() => {
        if (!refreshing.current) return;
        refreshing.current = false;
        setUpdateBusy(false);
        window.location.reload();
      }, UPDATE_RELOAD_TIMEOUT);
    } catch {
      refreshing.current = false;
      setUpdateBusy(false);
    }
  }

  const showIosHint = ios && !installed && canShowInstallHint();
  const showInstall = installVisible && !installed && (installPrompt || showIosHint) && !(updateReady && updateVisible);
  return <>
    {showInstall && <aside className="pwa-install" role="dialog" aria-label={t("pwa.install")} aria-live="polite">
      <div className="pwa-install-copy"><span className="pwa-install-icon"><Icon name="download" size={21}/></span><div><strong>{t("pwa.install")}</strong><p>{showIosHint ? t("pwa.iosHint") : t("pwa.installDescription")}</p></div></div>
      <div className="pwa-install-actions">{installPrompt && <button className="primary" onClick={() => void install()} disabled={installBusy}>{installBusy ? t("pwa.installing") : t("pwa.installButton")}</button>}<button className="text-button" onClick={dismissInstall}>{t("pwa.later")}</button></div>
    </aside>}
    {updateReady && updateVisible && <aside className="pwa-update" role="dialog" aria-label={t("pwa.updateReady")} aria-live="polite"><span>{t("pwa.updateReady")}</span><div className="pwa-update-actions"><button className="primary" onClick={applyUpdate} disabled={updateBusy}>{updateBusy ? t("pwa.installing") : t("pwa.update")}</button><button className="text-button" onClick={dismissUpdate} disabled={updateBusy}>{t("pwa.later")}</button></div></aside>}
  </>;
}
