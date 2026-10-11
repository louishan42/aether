"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { FileView } from "./datasets";

const KEY = "aether-file-view";

const FileViewContext = createContext<{
  view: FileView;
  setView: (view: FileView) => void;
}>({ view: "all", setView: () => undefined });

export function viewToQuery(view: FileView) {
  if (view === "all") return "all";
  if (view === "manual") return "manual";
  if (Array.isArray(view)) return view.join(",");
  return view;
}

export function FileViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<FileView>("all");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FileView;
      if (parsed === "all" || parsed === "manual" || typeof parsed === "string" || Array.isArray(parsed)) {
        setViewState(parsed);
      }
    } catch {
      setViewState("all");
    }
  }, []);

  function setView(next: FileView) {
    setViewState(next);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  }

  return <FileViewContext.Provider value={{ view, setView }}>{children}</FileViewContext.Provider>;
}

export function useFileView() {
  return useContext(FileViewContext);
}
