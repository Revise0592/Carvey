import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { syncShowcaseDemoBackupIfActive } from "@/lib/backup";
import { commitCsvImport, discardImport } from "@/lib/data-transfer";
import { rejectCrossOrigin } from "@/lib/security/request";

function redirect(params: Record<string, string>) {
  return new Response(null, { status: 303, headers: { Location: `/settings?${new URLSearchParams({ tab: "data", ...params })}` } });
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  await requireUser();
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  if (formData.get("cancel")) {
    await discardImport(token);
    return redirect({ import: "cancelled" });
  }
  const result = await commitCsvImport(token, formData.get("includeDuplicates") === "on");
  if (!result.ok) return redirect({ import: "error", message: result.message });
  await syncShowcaseDemoBackupIfActive();
  revalidatePath("/", "layout");
  return redirect({ import: "done", count: String(result.imported), skipped: String(result.skipped), label: result.label });
}
