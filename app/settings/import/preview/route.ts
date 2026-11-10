import { requireUser } from "@/lib/auth";
import { CSV_KINDS, type CsvKind } from "@/lib/csv-records";
import { stageCsvImport } from "@/lib/data-transfer";
import { rejectCrossOrigin } from "@/lib/security/request";

function redirect(params: Record<string, string>) {
  return new Response(null, { status: 303, headers: { Location: `/settings?${new URLSearchParams({ tab: "data", ...params })}` } });
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  await requireUser();
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect({ import: "error", message: "Could not read the upload." });
  }
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");
  const target = String(formData.get("vehicle") ?? "");
  const dateOrder = formData.get("dateOrder") === "mdy" ? "mdy" : "dmy";
  if (!(file instanceof File)) return redirect({ import: "error", message: "Choose a CSV file to import." });
  if (!(CSV_KINDS as readonly string[]).includes(kind)) return redirect({ import: "error", message: "Choose what the file contains." });

  const vehicleId = Number.parseInt(target, 10);
  const result = await stageCsvImport(
    file,
    kind as CsvKind,
    target === "registration" ? { mode: "registration" } : { mode: "vehicle", vehicleId },
    dateOrder
  );
  if (!result.ok) return redirect({ import: "error", message: result.message });
  return redirect({ import: "preview", token: result.token });
}
