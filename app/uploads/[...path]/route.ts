import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { safeUploadPath } from "@/lib/paths";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 404 });
  const { path } = await params;
  let filePath: string;
  try {
    filePath = safeUploadPath(path);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  let file: Buffer;
  try {
    file = await fs.readFile(filePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, max-age=31536000, immutable"
    }
  });
}
