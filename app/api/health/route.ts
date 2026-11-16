import fs from "node:fs/promises";
import { getDb } from "@/lib/db";
import { dataDir } from "@/lib/paths";

export const dynamic = "force-dynamic";

/**
 * Used by the Docker HEALTHCHECK. Healthy only if the database answers and the data directory is
 * writable (a full or read-only disk makes every save fail). Unauthenticated, so it reports a
 * status and nothing else.
 */
export async function GET() {
  try {
    getDb().prepare("SELECT 1").get();
    await fs.access(dataDir, fs.constants.W_OK);
    return Response.json({ ok: true, app: "carvey" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[Carvey] Health check failed:", error);
    return Response.json({ ok: false, app: "carvey" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
