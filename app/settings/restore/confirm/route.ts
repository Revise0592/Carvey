import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { confirmRestore } from "@/lib/backup";

export async function POST(request: Request) {
  await requireUser();
  const formData = await request.formData();
  const token = formData.get("token");
  const confirmed = formData.get("confirmed");

  if (typeof token !== "string" || confirmed !== "on") {
    return NextResponse.redirect(new URL("/settings?restore=confirm-required", request.url), 303);
  }

  const result = await confirmRestore(token);
  const target = new URL("/settings", request.url);
  if (result.ok) {
    target.searchParams.set("restore", "success");
  } else {
    target.searchParams.set("restore", "restore-error");
    target.searchParams.set("message", result.message);
  }
  return NextResponse.redirect(target, 303);
}
