import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createBackupZip } from "@/lib/backup";

export async function GET() {
  await requireUser();
  const { buffer, manifest } = await createBackupZip();
  const date = manifest.createdAt.slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="carvey-backup-${date}.zip"`,
      "cache-control": "no-store"
    }
  });
}
