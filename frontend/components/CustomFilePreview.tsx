"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { filesForView, listedDatasets, type DatasetFile } from "../lib/datasets";
import { useFileView } from "../lib/fileView";
import { DatasetTable } from "./DatasetTable";

export function CustomFilePreview() {
  const { view } = useFileView();
  const [files, setFiles] = useState<DatasetFile[]>([]);

  useEffect(() => {
    api
      .records()
      .then((data) => setFiles(listedDatasets(data)))
      .catch(() => setFiles([]));
  }, [view]);

  if (view === "manual") return null;
  const shown = filesForView(files, view);
  if (!shown.length) return null;

  return (
    <div className="space-y-4">
      {view === "all" ? (
        <p className="text-sm text-muted">All desk files except custom (payroll / unmatched). Click a file name to view that file only.</p>
      ) : shown.some((file) => file.kind === "custom") ? (
        <p className="text-sm text-muted">Custom file. All rows below. Not mapped to invoices, customers, or bookings.</p>
      ) : (
        <p className="text-sm text-muted">Every row in the selected file.</p>
      )}
      {shown.map((file) => (
        <DatasetTable key={file.id} file={file} />
      ))}
    </div>
  );
}
