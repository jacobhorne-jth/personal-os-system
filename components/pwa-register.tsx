"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      const hadController = Boolean(navigator.serviceWorker.controller);
      const resetKey = "jacob-os-dev-sw-reset";
      const unregisterWorkers = navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
      const clearCaches =
        "caches" in window
          ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          : Promise.resolve([]);

      Promise.all([unregisterWorkers, clearCaches]).then(() => {
        if (!hadController || sessionStorage.getItem(resetKey) === "done") {
          return;
        }
        sessionStorage.setItem(resetKey, "done");
        window.location.reload();
      });
      return;
    }

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA registration should never block the app shell.
      });
    }
  }, []);

  return null;
}
