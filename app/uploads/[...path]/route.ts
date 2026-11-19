import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAttachmentByFilename } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { safeUploadPath } from "@/lib/paths";

// Uploaded files are user content: stop browsers sniffing them into HTML and sandbox them if opened directly.
const uploadSecurityHeaders = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 404 });
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
    const isImage = contentType.startsWith("image/");
    const disposition = isImage ? "inline" : "attachment";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": contentType,
        "content-disposition": contentDisposition(disposition, originalName),
        "cache-control": "private, max-age=31536000, immutable",
        ...uploadSecurityHeaders
      }
    });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, max-age=31536000, immutable",
      ...uploadSecurityHeaders
    }
  });
}

/**
 * RFC 6266: an ASCII fallback for old clients plus the real UTF-8 name in filename*. The previous
 * header put a percent-encoded name inside the quoted filename, so downloads were saved as
 * "Facture%20%C3%A9t%C3%A9.pdf".
 */
function contentDisposition(disposition: "inline" | "attachment", name: string) {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_") || "download";
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
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
