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

  if (view === "all" || view === "manual") return null;
  const custom = filesForView(files, view).filter((file) => file.kind === "custom");
  if (!custom.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">This file is stored as custom. Rows below. Not mapped to invoices, customers, or bookings.</p>
      {custom.map((file) => (
        <DatasetTable key={file.id} file={file} />
      ))}
    </div>
  );
}
