import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for the November 2026 audit findings. Each block reproduces one bug that was
 * found by reading the code or by exploratory testing, and pins the fixed behaviour.
 */

const cookieMock = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn(), get: vi.fn() }));
const headerMock = vi.hoisted(() => ({ get: vi.fn((): string | null => null) }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieMock),
  headers: vi.fn(async () => headerMock)
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${to}`), { digest: `NEXT_REDIRECT;${to}` });
  })
}));

async function freshDataDir(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  return dir;
}

const vehicleInput = (registration = "AB12 CDE") => ({
  make: "Honda", model: "Civic", year: 2018, registration, vin: null,
  currentOdometer: 1000, purchasePrice: null, purchaseDate: null, notes: null
});

beforeEach(() => {
  cookieMock.set.mockReset();
  cookieMock.delete.mockReset();
  cookieMock.get.mockReset();
  headerMock.get.mockReset();
  headerMock.get.mockImplementation(() => null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("@/lib/auth");
});

describe("login throttling under concurrent requests", () => {
  it("does not let a burst of parallel wrong passwords bypass the 5-attempt limit", async () => {
    await freshDataDir("carvey-audit-throttle-");
    const db = await import("@/lib/db");
    const auth = await import("@/lib/auth");
    db.createAdminUser("admin", await bcrypt.hash("correct-horse", 4));

    const results = await Promise.all(Array.from({ length: 20 }, () => auth.login("admin", "wrong-password")));
    const invalid = results.filter((result) => result.status === "invalid").length;
    const throttled = results.filter((result) => result.status === "throttled").length;

    // Only 5 guesses may be checked per client per window; the rest must be refused unchecked.
    expect(invalid).toBe(5);
    expect(throttled).toBe(15);
  });

  it("still lets the right password in on the first try", async () => {
    await freshDataDir("carvey-audit-throttle-ok-");
    const db = await import("@/lib/db");
    const auth = await import("@/lib/auth");
    db.createAdminUser("admin", await bcrypt.hash("correct-horse", 4));
    await expect(auth.login("admin", "correct-horse")).resolves.toEqual({ status: "ok" });
  });
});

describe("restoring a backup that has no admin account", () => {
  it("keeps this server's admin instead of leaving the instance open to /setup", async () => {
    await freshDataDir("carvey-audit-restore-");
    const db = await import("@/lib/db");
    const backup = await import("@/lib/backup");
    db.createAdminUser("owner", await bcrypt.hash("owner-password", 4));
    db.createVehicle(vehicleInput());

    // A showcase-style backup is written without admin_users (like data/demo/showcase-backup.zip).
    const { buffer } = await backup.createBackupZip({ showcase: true });
    const staged = await backup.stageRestorePreview(new File([new Uint8Array(buffer)], "backup.zip", { type: "application/zip" }));
    if (!staged.ok) throw new Error(staged.message);
    const restored = await backup.confirmRestore(staged.summary.token);
    expect(restored.ok).toBe(true);

    expect(db.hasAdminUser()).toBe(true);
    expect(db.getAdminByUsername("owner")).toBeTruthy();
    expect(db.listVehicles()).toHaveLength(1);
  });
});

describe("todayIso", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("uses the server's local calendar day, not UTC", async () => {
    process.env.TZ = "Europe/London";
    vi.useFakeTimers();
    // 23:30 UTC on 1 July is 00:30 on 2 July in London (BST).
    vi.setSystemTime(new Date("2026-07-01T23:30:00Z"));
    const { todayIso } = await import("@/lib/dates");
    expect(todayIso()).toBe("2026-07-02");
  });

  it("agrees with the local hour used by the notification scheduler far from UTC", async () => {
    process.env.TZ = "Australia/Sydney";
    vi.useFakeTimers();
    // 09:00 on 3 March in Sydney is still 2 March in UTC.
    vi.setSystemTime(new Date("2026-03-02T22:00:00Z"));
    const { todayIso } = await import("@/lib/dates");
    expect(new Date().getHours()).toBe(9);
    expect(todayIso()).toBe("2026-03-03");
  });
});

describe("CSV import confirmation", () => {
  it("imports the rows once when the confirm button is submitted twice at the same time", async () => {
    await freshDataDir("carvey-audit-import-");
    const db = await import("@/lib/db");
    const transfer = await import("@/lib/data-transfer");
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    const staged = await transfer.stageCsvImport(
      new File(["Date,Mileage,Category,Description,Cost\n2026-01-14,34000,Brakes,Front pads,120\n"], "a.csv", { type: "text/csv" }),
      "maintenance",
      { mode: "vehicle", vehicleId },
      "dmy"
    );
    if (!staged.ok) throw new Error(staged.message);

    const [first, second] = await Promise.all([transfer.commitCsvImport(staged.token), transfer.commitCsvImport(staged.token)]);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(db.listMaintenance(vehicleId)).toHaveLength(1);
  });
});

describe("deleting a vehicle", () => {
  it("removes its attachment and gallery files from disk", async () => {
    await freshDataDir("carvey-audit-delete-");
    vi.doMock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: 1 })) }));
    const db = await import("@/lib/db");
    const paths = await import("@/lib/paths");
    const { deleteVehicleAction } = await import("@/app/actions/vehicles");
    paths.ensureDataDirs();
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    const recordId = Number(db.createMaintenance({ vehicleId, date: "2026-01-01", odometer: null, category: "Service", description: "Oil", cost: 0, notes: null }).lastInsertRowid);

    const vehicleDir = path.join(paths.attachmentDir, String(vehicleId));
    await fs.mkdir(vehicleDir, { recursive: true });
    await fs.writeFile(path.join(vehicleDir, `${vehicleId}-receipt.pdf`), "pdf");
    db.createAttachment({ recordType: "maintenance", recordId, vehicleId, filename: `${vehicleId}-receipt.pdf`, originalFilename: "receipt.pdf", mimeType: "application/pdf", fileSize: 3, filePath: `/uploads/attachments/${vehicleId}/${vehicleId}-receipt.pdf` });

    const form = new FormData();
    form.set("confirmed", "on");
    await expect(deleteVehicleAction(vehicleId, form)).rejects.toThrow(/NEXT_REDIRECT/);

    expect(db.getVehicle(vehicleId)).toBeUndefined();
    await expect(fs.access(vehicleDir)).rejects.toThrow();
  });
});

describe("attachment uploads", () => {
  function uploadRequest(fields: Record<string, string | File>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return new Request("http://carvey.test/api/attachments", {
      method: "POST",
      headers: { host: "carvey.test", origin: "http://carvey.test", "sec-fetch-site": "same-origin" },
      body: form
    });
  }

  it("names the stored file from its checked type, not the client's file name", async () => {
    await freshDataDir("carvey-audit-upload-");
    vi.doMock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: 1 })) }));
    const db = await import("@/lib/db");
    const { POST } = await import("@/app/api/attachments/route");
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    const recordId = Number(db.createMaintenance({ vehicleId, date: "2026-01-01", odometer: null, category: "Service", description: "Oil", cost: 0, notes: null }).lastInsertRowid);

    const response = await POST(uploadRequest({
      vehicleId: String(vehicleId), recordType: "maintenance", recordId: String(recordId),
      file: new File(["<script>alert(1)</script>"], "notes.html", { type: "text/plain" })
    }));
    expect(response.status).toBe(303);
    const [stored] = db.listAttachments("maintenance", recordId);
    expect(stored.filename).toMatch(/\.txt$/);
    expect(stored.originalFilename).toBe("notes.html");
  });

  it("refuses an upload for a record that does not exist, without leaving a file behind", async () => {
    const dir = await freshDataDir("carvey-audit-upload-missing-");
    vi.doMock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: 1 })) }));
    const db = await import("@/lib/db");
    const { POST } = await import("@/app/api/attachments/route");
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);

    const response = await POST(uploadRequest({
      vehicleId: String(vehicleId + 50), recordType: "maintenance", recordId: "999",
      file: new File(["%PDF-1.4"], "receipt.pdf", { type: "application/pdf" })
    }));
    expect(response.status).toBe(404);
    await expect(fs.readdir(path.join(dir, "uploads", "attachments", String(vehicleId + 50)))).rejects.toThrow();
  });
});

describe("upload downloads", () => {
  it("sends non-ASCII original file names in an RFC 6266 filename* parameter", async () => {
    await freshDataDir("carvey-audit-download-");
    vi.doMock("@/lib/auth", () => ({ currentUser: vi.fn(async () => ({ id: 1 })) }));
    const db = await import("@/lib/db");
    const paths = await import("@/lib/paths");
    const { GET } = await import("@/app/uploads/[...path]/route");
    paths.ensureDataDirs();
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    await fs.mkdir(path.join(paths.attachmentDir, String(vehicleId)), { recursive: true });
    await fs.writeFile(path.join(paths.attachmentDir, String(vehicleId), "1-x.pdf"), "pdf");
    db.createAttachment({ recordType: "maintenance", recordId: 1, vehicleId, filename: "1-x.pdf", originalFilename: "Facture été.pdf", mimeType: "application/pdf", fileSize: 3, filePath: `/uploads/attachments/${vehicleId}/1-x.pdf` });

    const response = await GET(new Request("http://carvey.test/"), { params: Promise.resolve({ path: ["attachments", String(vehicleId), "1-x.pdf"] }) });
    const disposition = response.headers.get("content-disposition") ?? "";
    expect(disposition).toContain(`filename*=UTF-8''Facture%20%C3%A9t%C3%A9.pdf`);
    expect(disposition).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=/);
  });
});

describe("upload content checks", () => {
  it("accepts real file signatures and rejects a mislabelled file", async () => {
    const { contentMatchesMime } = await import("@/lib/uploads");
    const bytes = (...values: number[]) => new Uint8Array(values);
    expect(contentMatchesMime(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(contentMatchesMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png")).toBe(true);
    expect(contentMatchesMime(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
    expect(contentMatchesMime(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "), "image/webp")).toBe(true);
    expect(contentMatchesMime(new TextEncoder().encode("<html><script>"), "image/png")).toBe(false);
    expect(contentMatchesMime(new TextEncoder().encode("MZ\0\0binary"), "text/plain")).toBe(false);
    expect(contentMatchesMime(new TextEncoder().encode("anything"), "image/svg+xml")).toBe(false);
  });
});

describe("server-side form validation", () => {
  const form = (values: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  };

  it("rejects dates that aren't real calendar dates", async () => {
    const { isoDate, nullableIsoDate } = await import("@/app/actions/shared");
    expect(isoDate(form({ date: "2026-02-28" }), "date")).toBe("2026-02-28");
    expect(nullableIsoDate(form({ date: "" }), "date")).toBeNull();
    for (const bad of ["next tuesday", "31/02/2026", "2026-02-31", "2026-13-01"]) {
      expect(() => isoDate(form({ date: bad }), "date")).toThrow();
    }
  });

  it("rejects numbers that aren't numbers, and negative odometers", async () => {
    const { money, nullableInt, nullableMoney } = await import("@/app/actions/shared");
    expect(money(form({ cost: "" }), "cost")).toBe(0);
    expect(money(form({ cost: "12.50" }), "cost")).toBe(12.5);
    expect(nullableInt(form({ odometer: "12000" }), "odometer")).toBe(12000);
    expect(() => money(form({ cost: "abc" }), "cost")).toThrow();
    expect(() => nullableMoney(form({ cost: "Infinity" }), "cost")).toThrow();
    expect(() => nullableInt(form({ odometer: "-500" }), "odometer")).toThrow();
    expect(() => nullableInt(form({ year: "nineteen" }), "year")).toThrow();
  });

  it("formats a stored non-date as-is instead of crashing the page", async () => {
    const { formatDate } = await import("@/lib/format");
    expect(formatDate("next tuesday")).toBe("next tuesday");
    expect(formatDate("2026-03-14")).toBe("14 Mar 2026");
  });
});

describe("test name in sentences", () => {
  it("keeps acronyms upper case and lower-cases ordinary words", async () => {
    const { motLabelInSentence } = await import("@/lib/regional-settings");
    expect(motLabelInSentence("MOT")).toBe("MOT");
    expect(motLabelInSentence("TÜV")).toBe("TÜV");
    expect(motLabelInSentence("Inspection")).toBe("inspection");
  });
});
