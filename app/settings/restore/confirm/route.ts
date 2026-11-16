import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { confirmRestore } from "@/lib/backup";
import { rejectCrossOrigin } from "@/lib/security/request";

function redirect(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await requireUser();
  const formData = await request.formData();
  const token = formData.get("token");
  const confirmed = formData.get("confirmed");

  if (typeof token !== "string" || confirmed !== "on") {
    return redirect("/settings?tab=backup&restore=confirm-required");
  }

  const result = await confirmRestore(token, { keepSessionId: user.sessionId });
  if (result.ok) {
    await audit("backup.restored");
    return redirect("/settings?tab=backup&restore=success");
  }
  const params = new URLSearchParams({ tab: "backup", restore: "restore-error", message: result.message });
  return redirect(`/settings?${params}`);
}
