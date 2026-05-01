import { requireUser } from "@/lib/auth";
import { stageRestorePreview } from "@/lib/backup";

function redirect(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function POST(request: Request) {
  await requireUser();
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect("/settings?tab=backup&restore=invalid-upload");
  }

  const file = formData.get("backup");
  if (!(file instanceof File)) {
    return redirect("/settings?tab=backup&restore=missing-file");
  }

  const result = await stageRestorePreview(file);
  if (!result.ok) {
    const params = new URLSearchParams({ tab: "backup", restore: "preview-error", message: result.message });
    return redirect(`/settings?${params}`);
  }

  const params = new URLSearchParams({ tab: "backup", restore: "preview", token: result.summary.token });
  return redirect(`/settings?${params}`);
}
