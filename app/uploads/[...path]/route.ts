import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAppSetting, getAttachmentByFilename } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { safeUploadPath } from "@/lib/paths";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const authDisabled = getAppSetting("authDisabled") === "true";
  if (!authDisabled) {
    const user = await currentUser();
    if (!user) return new NextResponse(null, { status: 404 });
  }
  const { path: pathParts } = await params;
  let filePath: string;
  try {
    filePath = safeUploadPath(pathParts);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  let file: Buffer;
  try {
    file = await fs.readFile(filePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const isAttachment = pathParts[0] === "attachments";
  if (isAttachment) {
    const filename = pathParts[pathParts.length - 1];
    const attachment = getAttachmentByFilename(filename);
    const contentType = attachment?.mimeType ?? contentTypeFromExt(path.extname(filename));
    const originalName = attachment?.originalFilename ?? filename;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${encodeURIComponent(originalName)}"`,
        "cache-control": "private, max-age=31536000, immutable"
      }
    });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, max-age=31536000, immutable"
    }
  });
}

function contentTypeFromExt(ext: string) {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".txt": "text/plain"
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
