import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { stageRestorePreview } from "@/lib/backup";

export async function POST(request: Request) {
  await requireUser();
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.redirect(new URL("/settings?restore=invalid-upload", request.url), 303);
  }

  const file = formData.get("backup");
  if (!(file instanceof File)) {
    return NextResponse.redirect(new URL("/settings?restore=missing-file", request.url), 303);
  }

  const result = await stageRestorePreview(file);
  if (!result.ok) {
    const target = new URL("/settings", request.url);
    target.searchParams.set("restore", "preview-error");
    target.searchParams.set("message", result.message);
    return NextResponse.redirect(target, 303);
  }

  const target = new URL("/settings", request.url);
  target.searchParams.set("restore", "preview");
  target.searchParams.set("token", result.summary.token);
  return NextResponse.redirect(target, 303);
}
