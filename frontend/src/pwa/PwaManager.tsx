import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../components/UI";

type InstallOutcome = "accepted" | "dismissed";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
};
type StandaloneNavigator = Navigator & { standalone?: boolean };

const INSTALL_DISMISSED_KEY = "nivasafe-pwa-install-dismissed";
const INSTALL_DISMISS_TTL = 14 * 24 * 60 * 60 * 1000;

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
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(true);
  const refreshing = useRef(false);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone()) setInstalled(true);
    if (isIos() && !isStandalone() && canShowInstallHint()) setInstallVisible(true);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      setInstallPrompt(prompt);
      if (!isStandalone() && canShowInstallHint()) setInstallVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallVisible(false);
      try { localStorage.removeItem(INSTALL_DISMISSED_KEY); } catch { /* Ignore unavailable storage. */ }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    const markWaiting = () => {
      if (active && currentRegistration?.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
        // A previously dismissed update must become visible again when a newer
        // worker is ready; otherwise users could miss future releases until a
        // full reload.
        setUpdateVisible(true);
      }
    };
    const watchInstalling = () => {
      const worker = currentRegistration?.installing;
      if (!worker) { markWaiting(); return; }
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") markWaiting();
      });
    };
    const onControllerChange = () => {
      if (!refreshing.current) return;
      refreshing.current = false;
      window.location.reload();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void currentRegistration?.update().catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((value) => {
      if (!active) return;
      currentRegistration = value;
      setRegistration(value);
      value.addEventListener("updatefound", watchInstalling);
      watchInstalling();
      void value.update().catch(() => undefined);
    }).catch(() => undefined);
    return () => {
      active = false;
      currentRegistration?.removeEventListener("updatefound", watchInstalling);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const dismissInstall = useCallback(() => {
    rememberInstallDismissal();
    setInstallVisible(false);
  }, []);

  async function install() {
    if (!installPrompt || installBusy) return;
    setInstallBusy(true);
    try {
      const prompt = installPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } finally {
      setInstallPrompt(null);
      setInstallVisible(false);
      setInstallBusy(false);
    }
  }

  function applyUpdate() {
    const waiting = registration?.waiting;
    if (!waiting) { setUpdateReady(false); return; }
    refreshing.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  const showIosHint = ios && !installed && canShowInstallHint();
  return <>
    {installVisible && !installed && (installPrompt || showIosHint) && <aside className="pwa-install" role="dialog" aria-label="نصب اپلیکیشن NIVASafe">
      <div className="pwa-install-copy"><span className="pwa-install-icon"><Icon name="download" size={21}/></span><div><strong>نصب اپلیکیشن NIVASafe</strong><p>{showIosHint ? "از منوی Share گزینه Add to Home Screen را انتخاب کنید." : "دسترسی سریع، اجرای مستقل و استفادهٔ روان‌تر روی دستگاه شما."}</p></div></div>
      <div className="pwa-install-actions">{installPrompt ? <button className="primary" onClick={() => void install()} disabled={installBusy}>{installBusy ? "در حال نصب…" : "نصب"}</button> : <button className="ghost" onClick={dismissInstall}>راهنما</button>}<button className="text-button" onClick={dismissInstall}>بعداً</button></div>
    </aside>}
    {updateReady && updateVisible && <aside className="pwa-update" role="status"><span>نسخهٔ جدید NIVASafe آماده است.</span><div className="pwa-update-actions"><button className="primary" onClick={applyUpdate}>به‌روزرسانی</button><button className="text-button" onClick={() => setUpdateVisible(false)}>بعداً</button></div></aside>}
  </>;
}
