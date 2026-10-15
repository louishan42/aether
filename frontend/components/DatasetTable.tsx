"use client";

import { useState } from "react";
import { pageRows, TABLE_PAGE, type DatasetFile } from "../lib/datasets";
import { TablePager } from "./TablePager";

export function DatasetTable({ file }: { file: DatasetFile }) {
  const [page, setPage] = useState(1);
  const headers = file.headers?.length ? file.headers : Object.keys(file.rows?.[0] ?? {});
  const rows = file.rows ?? [];
  const paged = pageRows(rows, page, TABLE_PAGE);

  return (
    <section className="panel overflow-x-auto p-5">
      <h2 className="font-medium tracking-tight">{file.filename}</h2>
      <p className="mt-1 text-sm text-muted">
        {file.kind}
        {file.kind === "custom" ? " · stored only" : ""} · {file.rowCount ?? rows.length} rows
        {file.importedAt ? ` · ${new Date(file.importedAt).toLocaleString()}` : ""}
      </p>
      <table className="mt-3 w-full min-w-[20rem] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="py-3 text-muted" colSpan={Math.max(headers.length, 1)}>
                No rows in this file.
              </td>
            </tr>
          )}
          {paged.map((row, index) => (
            <tr key={`${file.id}-${page}-${index}`} className="border-t border-edge">
              {headers.map((header) => (
                <td key={header} className="py-2 pr-3">
                  {row[header] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePager total={rows.length} page={page} onPage={setPage} />
    </section>
  );
}
