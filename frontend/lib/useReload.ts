"use client";

import { useEffect, useRef } from "react";

export function useReload(load: () => Promise<void>, onError: (message: string) => void) {
  const loadRef = useRef(load);
  const errorRef = useRef(onError);
  loadRef.current = load;
  errorRef.current = onError;

  useEffect(() => {
    const run = () => {
      loadRef.current().catch((err) => errorRef.current(err instanceof Error ? err.message : "Load failed"));
    };
    run();
    const onFocus = () => run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
