/** Minimal RFC 4180 CSV reading and writing: quoted fields, escaped quotes, CRLF or LF, BOM. */

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** Picks comma, semicolon or tab from the header line (spreadsheets in many locales use `;`). */
export function detectDelimiter(text: string) {
  const header = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((delimiter) => ({ delimiter, count: header.split(delimiter).length - 1 }));
  return counts.sort((a, b) => b.count - a.count)[0].count > 0 ? counts[0].delimiter : ",";
}

function escapeField(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Prefix formula-looking text so spreadsheets don't execute it (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((row) => row.map(escapeField).join(",")).join("\r\n") + "\r\n";
}
