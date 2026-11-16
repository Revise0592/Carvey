import { Readable } from "node:stream";
import { requireUser } from "@/lib/auth";
import { createBackupStream } from "@/lib/backup";

export async function GET() {
  await requireUser();
  // Streamed: photos and documents are read from disk as the download proceeds, so a large
  // uploads folder no longer has to fit in memory twice.
  const { stream, manifest } = await createBackupStream();
  const date = manifest.createdAt.slice(0, 10);

  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="carvey-backup-${date}.zip"`,
      "cache-control": "no-store"
    }
  });
}
