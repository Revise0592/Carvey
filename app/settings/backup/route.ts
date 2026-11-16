import fs from "node:fs";
import { Readable } from "node:stream";
import { requireUser } from "@/lib/auth";
import { createBackupStream } from "@/lib/backup";
import { scheduledBackupPath } from "@/lib/scheduled-backups";

export async function GET(request: Request) {
  await requireUser();

  // ?file=carvey-backup-YYYY-MM-DD.zip downloads one of the nightly backups.
  const fileName = new URL(request.url).searchParams.get("file");
  if (fileName !== null) {
    const filePath = scheduledBackupPath(fileName);
    const stat = filePath ? await fs.promises.stat(filePath).catch(() => null) : null;
    if (!filePath || !stat?.isFile()) return new Response("Not found", { status: 404 });
    return new Response(Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>, {
      headers: {
        "content-type": "application/zip",
        "content-length": String(stat.size),
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store"
      }
    });
  }

  // Otherwise a fresh backup, streamed: photos and documents are read from disk as the download
  // proceeds, so a large uploads folder never has to fit in memory.
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
