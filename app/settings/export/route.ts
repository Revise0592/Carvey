import { requireUser } from "@/lib/auth";
import { CSV_KINDS, type CsvKind } from "@/lib/csv-records";
import { exportAllZip, exportCsv } from "@/lib/data-transfer";
import { todayIso } from "@/lib/dates";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "all";
  const vehicleParam = url.searchParams.get("vehicle");
  const vehicleId = vehicleParam && vehicleParam !== "all" ? Number.parseInt(vehicleParam, 10) : null;
  const date = todayIso();

  if (kind === "all") {
    return new Response(new Uint8Array(exportAllZip()), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="carvey-csv-${date}.zip"`,
        "cache-control": "no-store"
      }
    });
  }
  if (!(CSV_KINDS as readonly string[]).includes(kind)) return new Response("Unknown export type", { status: 400 });
  const body = "﻿" + exportCsv(kind as CsvKind, Number.isFinite(vehicleId) ? vehicleId : null);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="carvey-${kind}-${date}.csv"`,
      "cache-control": "no-store"
    }
  });
}
