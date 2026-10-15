export type DatasetFile = {
  id: string;
  filename: string;
  kind: string;
  rowCount?: number;
  importedAt?: string;
  headers?: string[];
  rows?: Record<string, string>[];
};

export type FileView = "all" | "manual" | string | string[];

export const TABLE_PAGE = 200;

export function listedDatasets(records: { datasets?: DatasetFile[]; files?: DatasetFile[] }) {
  return records.datasets?.length ? records.datasets : (records.files ?? []);
}

export function filesForView(files: DatasetFile[], view: FileView, kinds?: string[]) {
  if (view === "manual") return [];
  if (view === "all") {
    return files.filter((file) => !kinds?.length || kinds.includes(file.kind));
  }
  const ids = new Set(Array.isArray(view) ? view : [view]);
  return files.filter((file) => ids.has(file.id));
}

export function rowsForView<T extends { sourceImportId?: string | null }>(rows: T[], view: FileView, _files: DatasetFile[] = []) {
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
