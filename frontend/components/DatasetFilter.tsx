"use client";

import { useMemo, useState } from "react";
import type { DatasetFile, FileView } from "../lib/datasets";

export function DatasetFilter({
  files,
  value,
  onChange,
  hasManual,
  rowTotal,
}: {
  files: DatasetFile[];
  value: FileView;
  onChange: (value: FileView) => void;
  hasManual?: boolean;
  rowTotal?: number;
}) {
  const [query, setQuery] = useState("");
  const [pickSeveral, setPickSeveral] = useState(Array.isArray(value));
  const selected = Array.isArray(value) ? value : value === "all" || value === "manual" ? [] : [value];

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => !needle || file.filename.toLowerCase().includes(needle));
  }, [files, query]);

  if (files.length < 2 && !hasManual) return null;

  const bothLabel = files.length === 2 ? "Both files" : `All ${files.length} files`;
  const label = Array.isArray(value)
    ? `${value.length} file${value.length === 1 ? "" : "s"} selected`
    : value === "all"
      ? bothLabel
      : value === "manual"
        ? "Manual rows"
        : files.find((file) => file.id === value)?.filename ?? "One file";

  function chooseOne(id: string) {
    setPickSeveral(false);
    onChange(id);
  }

  function toggleMany(id: string) {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    onChange(next.length ? next : "all");
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Which files</p>
          <p className="mt-1 font-medium tracking-tight">{label}</p>
          <p className="mt-1 text-sm text-muted">Both is the default. Click a filename for one file only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={value === "all" ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"}
            onClick={() => {
              setPickSeveral(false);
              onChange("all");
            }}
          >
            {files.length === 2 ? "Both files" : "All files"}
          </button>
          {hasManual ? (
            <button
              type="button"
              className={value === "manual" ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"}
              onClick={() => onChange("manual")}
            >
              Manual
            </button>
          ) : null}
          <button
            type="button"
            className={pickSeveral ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"}
            onClick={() => {
              if (pickSeveral) {
                setPickSeveral(false);
                return;
              }
              setPickSeveral(true);
              if (!Array.isArray(value)) onChange(value === "all" || value === "manual" ? files.map((file) => file.id) : [value]);
            }}
          >
            Pick several
          </button>
        </div>
      </div>

      {files.length > 5 || query || pickSeveral ? (
        <input
          className="field mt-3"
          placeholder={`Search ${files.length} files`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}

      <div className={`mt-3 flex flex-wrap gap-2 ${files.length > 8 ? "dataset-file-scroll" : ""}`}>
        {matched.map((file) => {
          const active = pickSeveral ? selected.includes(file.id) : value === file.id;
          return (
            <button
              key={file.id}
              type="button"
              className={active ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"}
              onClick={() => (pickSeveral ? toggleMany(file.id) : chooseOne(file.id))}
            >
              {file.filename}
              {typeof file.rowCount === "number" ? ` · ${file.rowCount}` : ""}
            </button>
          );
        })}
        {matched.length === 0 && <p className="text-sm text-muted">No file names match that search.</p>}
      </div>
    </section>
  );
}
