export function parseCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const first = raw.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const table = parseTable(raw, delimiter);
  if (table.length < 2) return [];
  const headers = table[0].map((header) => header.trim());
  return table.slice(1).map((cols) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = (cols[index] ?? "").trim();
    });
    return row;
  });
}

function parseTable(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || (char === "\r" && next === "\n")) {
      if (char === "\r") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function importRows<T>(csv: string, schema: { safeParse: (raw: Record<string, string>) => { success: true; data: T } | { success: false; error: { issues: { message?: string }[] } } }) {
  const parsed = parseCsv(csv);
  const rows: T[] = [];
  const errors: { row: number; message: string }[] = [];
  parsed.forEach((raw, index) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      errors.push({ row: index + 2, message: result.error.issues[0]?.message ?? "invalid row" });
      return;
    }
    rows.push(result.data);
  });
  return { rows, errors };
}
