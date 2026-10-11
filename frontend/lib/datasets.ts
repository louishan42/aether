export type DatasetFile = {
  id: string;
  filename: string;
  kind: string;
  rowCount?: number;
  importedAt?: string;
};

export type FileView = "all" | "manual" | string | string[];

export const TABLE_PAGE = 40;

export function listedDatasets(records: { datasets?: DatasetFile[]; files?: DatasetFile[] }) {
  return records.datasets?.length ? records.datasets : (records.files ?? []);
}

export function rowsForView<T extends { sourceImportId?: string | null }>(rows: T[], view: FileView) {
  if (view === "all") return rows;
  if (Array.isArray(view)) {
    if (!view.length) return rows;
    const ids = new Set(view);
    return rows.filter((row) => row.sourceImportId && ids.has(row.sourceImportId));
  }
  return rows.filter((row) => row.sourceImportId === view);
}

export function pageRows<T>(rows: T[], page: number, size = TABLE_PAGE) {
  const start = (page - 1) * size;
  return rows.slice(start, start + size);
}
