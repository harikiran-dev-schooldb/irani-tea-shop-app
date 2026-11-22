"use client";

import { useEffect, useState } from "react";
import { DownloadCloud, RefreshCw, X } from "lucide-react";

export default function PwaUpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let hadController = Boolean(navigator.serviceWorker.controller);
    function onControllerChange() {
      if (hadController) setUpdateAvailable(true);
      hadController = true;
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  if (!updateAvailable) return null;
  return <div className="pwa-update" role="status">
    <span><DownloadCloud size={18} /> A newer version of Irani Tea is ready.</span>
    <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Update now</button>
    <button type="button" className="pwa-dismiss" aria-label="Dismiss update notice" onClick={() => setUpdateAvailable(false)}><X size={16} /></button>
  </div>;
}
