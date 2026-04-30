import { requireUser } from "@/lib/auth";
import { confirmRestore } from "@/lib/backup";

function redirect(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function POST(request: Request) {
  await requireUser();
  const formData = await request.formData();
  const token = formData.get("token");
  const confirmed = formData.get("confirmed");

  if (typeof token !== "string" || confirmed !== "on") {
    return redirect("/settings?restore=confirm-required");
  }

  const result = await confirmRestore(token);
  if (result.ok) {
    return redirect("/settings?restore=success");
  }
  const params = new URLSearchParams({ restore: "restore-error", message: result.message });
  return redirect(`/settings?${params}`);
}
