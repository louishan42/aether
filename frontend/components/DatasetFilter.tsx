"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { listedDatasets, type DatasetFile, type FileView } from "../lib/datasets";
import { useFileView } from "../lib/fileView";

export function DatasetFilter({
  files: filesProp,
  value,
  onChange,
  hasManual,
}: {
  files?: DatasetFile[];
  value?: FileView;
  onChange?: (value: FileView) => void;
  hasManual?: boolean;
  rowTotal?: number;
}) {
  const shared = useFileView();
  const view = value ?? shared.view;
  const setView = onChange ?? shared.setView;
  const [loaded, setLoaded] = useState<DatasetFile[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (filesProp) return;
    api
      .records()
      .then((data) => setLoaded(listedDatasets(data)))
      .catch(() => setLoaded([]));
  }, [filesProp]);

  const files = filesProp ?? loaded;

  useEffect(() => {
    if (!files.length) return;
    if (view === "all" || view === "manual") return;
    const ids = Array.isArray(view) ? view : [view];
    const known = new Set(files.map((file) => file.id));
    if (ids.some((id) => !known.has(id))) setView("all");
  }, [files, view, setView]);
  const selected = Array.isArray(view) ? view : view === "all" || view === "manual" ? [] : [view];
  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => !needle || file.filename.toLowerCase().includes(needle));
  }, [files, query]);

  const label =
    view === "all"
      ? "All datasets"
      : view === "manual"
        ? "Manual rows"
        : Array.isArray(view)
          ? `${view.length} selected`
          : files.find((file) => file.id === view)?.filename ?? "One dataset";

  function chooseFile(id: string) {
    if (view === "all" || view === "manual") {
      setView(id);
      return;
    }
    if (typeof view === "string" && view === id) {
      setView("all");
      return;
    }
    if (typeof view === "string") {
      setView([view, id]);
      return;
    }
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    setView(next.length === 0 ? "all" : next.length === 1 ? next[0] : next);
  }

  if (!files.length) {
    return (
      <section className="dset-bar">
        <div className="dset-bar-top">
          <span className="dset-kicker">Datasets</span>
          <strong>None loaded</strong>
        </div>
        <Link href="/datasets" className="dset-pill">
          Load files
        </Link>
      </section>
    );
  }

  return (
    <section className="dset-bar">
      <div className="dset-bar-top">
        <span className="dset-kicker">Datasets</span>
        <strong>{label}</strong>
      </div>
      <div className={`dset-pills ${files.length > 8 ? "dataset-file-scroll" : ""}`}>
        <button type="button" className={view === "all" ? "dset-pill on all" : "dset-pill"} onClick={() => setView("all")}>
          All datasets
        </button>
        {hasManual ? (
          <button type="button" className={view === "manual" ? "dset-pill on" : "dset-pill"} onClick={() => setView("manual")}>
            Manual
          </button>
        ) : null}
        {files.length > 6 ? (
          <input
            className="dset-search"
            placeholder="Search files"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}
        {matched.map((file) => {
          const on = selected.includes(file.id) && view !== "all";
          return (
            <button key={file.id} type="button" className={on ? "dset-pill on" : "dset-pill"} onClick={() => chooseFile(file.id)}>
              {file.filename}
              {typeof file.rowCount === "number" ? ` · ${file.rowCount}` : ""}
            </button>
          );
        })}
      </div>
    </section>
  );
}
