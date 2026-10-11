"use client";

import { TABLE_PAGE } from "../lib/datasets";

export function TablePager({
  total,
  page,
  onPage,
  size = TABLE_PAGE,
}: {
  total: number;
  page: number;
  onPage: (page: number) => void;
  size?: number;
}) {
  if (total <= size) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size + 1;
  const end = Math.min(total, page * size);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3 text-sm">
      <p className="text-muted">
        {start}–{end} of {total}
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost text-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn-ghost text-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
