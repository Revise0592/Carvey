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
// Typed with a parameter so tests can mock per-header values; returns no headers by default.
const headerMock = vi.hoisted(() => ({ get: vi.fn<(name: string) => string | null>(() => null) }));

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

describe("restoring a re-zipped backup", () => {
  // Traversal in entry names is covered by backup.test.ts, which hand-builds the zip: adm-zip
  // strips "../" when creating one, so it can't be used to make a malicious archive here.
  it("accepts folder entries", async () => {
    await freshDataDir("carvey-audit-rezip-");
    const AdmZip = (await import("adm-zip")).default;
    const db = await import("@/lib/db");
    const backup = await import("@/lib/backup");
    db.createVehicle(vehicleInput());
    const original = new AdmZip((await backup.createBackupZip()).buffer);
    const rezip = (extra: string) => {
      const zip = new AdmZip();
      zip.addFile(extra, Buffer.alloc(0));
      for (const entry of original.getEntries()) zip.addFile(entry.entryName, entry.getData());
      return new File([new Uint8Array(zip.toBuffer())], "backup.zip", { type: "application/zip" });
    };
    await expect(backup.stageRestorePreview(rezip("uploads/"))).resolves.toMatchObject({ ok: true });
  });
});

describe("backup manifest", () => {
  it("records the running Carvey version", async () => {
    await freshDataDir("carvey-audit-manifest-");
    const backup = await import("@/lib/backup");
    const { version } = (await import("../package.json")).default;
    const { manifest } = await backup.createBackupZip();
    expect(manifest.appVersion).toBe(version);
  });
});

describe("record form input", () => {
  it("validates every field before creating a new workshop", async () => {
    await freshDataDir("carvey-audit-workshop-");
    const db = await import("@/lib/db");
    const { maintenanceInput } = await import("@/app/actions/shared");
    const form = new FormData();
    form.set("date", "not a date");
    form.set("category", "Service");
    form.set("description", "Oil");
    form.set("garage", "Brand New Garage");
    expect(() => maintenanceInput(form)).toThrow();
    expect(db.listWorkshops().map((workshop) => workshop.name)).not.toContain("Brand New Garage");

    form.set("date", "2026-04-01");
    expect(maintenanceInput(form)).toMatchObject({ date: "2026-04-01", garage: "Brand New Garage", cost: 0, notes: null });
  });

  it("caps very long notes", async () => {
    const { optionalText } = await import("@/app/actions/shared");
    const form = new FormData();
    form.set("notes", "x".repeat(10_001));
    expect(() => optionalText(form, "notes")).toThrow();
  });
});

describe("account lockout by strangers", () => {
  it("still lets a known device sign in while the account is locked for everyone else", async () => {
    await freshDataDir("carvey-audit-device-");
    const db = await import("@/lib/db");
    const auth = await import("@/lib/auth");
    db.createAdminUser("admin", await bcrypt.hash("correct-horse", 4));

    // The owner signs in once from their phone and gets a known-device cookie.
    await expect(auth.login("admin", "correct-horse")).resolves.toEqual({ status: "ok" });
    const deviceCookie = cookieMock.set.mock.calls.find(([name]) => name === "carvey_device")?.[1] as string;
    expect(deviceCookie).toMatch(/^1\.\d+\.[a-f0-9]{24}\.[\w-]+$/);

    // A stranger rotates through addresses until the account-wide limit locks the account.
    let address = 0;
    headerMock.get.mockImplementation((name: string) => (name === "x-forwarded-for" ? `203.0.113.${address}` : null));
    for (; address < 25; address++) await auth.login("admin", "guess");
    await expect(auth.login("admin", "correct-horse")).resolves.toMatchObject({ status: "throttled" });

    // The owner's phone is unaffected.
    cookieMock.get.mockImplementation((name: string) => (name === "carvey_device" ? { value: deviceCookie } : undefined));
    await expect(auth.login("admin", "correct-horse")).resolves.toEqual({ status: "ok" });
  });

  it("rejects forged, expired or other-account device cookies", async () => {
    await freshDataDir("carvey-audit-device-verify-");
    const device = await import("@/lib/security/known-device");
    const now = Date.now();
    const token = device.issueKnownDeviceToken(1, now);
    expect(device.verifyKnownDeviceToken(token, 1, now)).toMatch(/^[a-f0-9]{24}$/);
    expect(device.verifyKnownDeviceToken(token, 2, now)).toBeNull();
    expect(device.verifyKnownDeviceToken(token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), 1, now)).toBeNull();
    expect(device.verifyKnownDeviceToken(token, 1, now + (device.knownDeviceMaxAgeSeconds + 60) * 1000)).toBeNull();
    expect(device.verifyKnownDeviceToken("2.1.aaaaaaaaaaaaaaaaaaaaaaaa.x", 2, now)).toBeNull();
  });
});

describe("client address for rate limiting", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

  it("takes the entry written by the trusted proxy, not one the client sent", async () => {
    const { clientAddress } = await import("@/lib/security/request");
    // The client sent a fake X-Forwarded-For; Traefik appended the real address.
    expect(clientAddress(headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" }), {})).toBe("198.51.100.7");
    expect(clientAddress(headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.2" }), { CARVEY_TRUSTED_PROXY_HOPS: "2" })).toBe("198.51.100.7");
    expect(clientAddress(headers({ "x-forwarded-for": "1.2.3.4" }), { CARVEY_TRUSTED_PROXY_HOPS: "0" })).toBe("direct");
    expect(clientAddress(headers({ "x-real-ip": "198.51.100.9" }), {})).toBe("198.51.100.9");
    expect(clientAddress(headers({}), {})).toBe("direct");
  });
});

describe("re-authentication before account changes", () => {
  it("is throttled, so a stolen session can't guess the password", async () => {
    await freshDataDir("carvey-audit-reauth-");
    const db = await import("@/lib/db");
    const twoFactor = await import("@/lib/two-factor");
    const userId = Number(db.createAdminUser("admin", await bcrypt.hash("correct-horse", 4)).lastInsertRowid);

    const guesses = await Promise.all(Array.from({ length: 8 }, () => twoFactor.verifyReauthentication(userId, "guess", null)));
    expect(guesses.filter((r) => !r.ok && r.reason === "password")).toHaveLength(5);
    expect(guesses.filter((r) => !r.ok && r.reason === "throttled")).toHaveLength(3);
    await expect(twoFactor.verifyReauthentication(userId, "correct-horse", null)).resolves.toEqual({ ok: false, reason: "throttled" });
  });
});

describe("To Buy links", () => {
  it("accepts web links, adds https:// to bare domains, and refuses other schemes", async () => {
    const { optionalHttpUrl } = await import("@/app/actions/shared");
    const form = (url: string) => {
      const data = new FormData();
      data.set("url", url);
      return data;
    };
    expect(optionalHttpUrl(form(""), "url")).toBeNull();
    expect(optionalHttpUrl(form("https://example.com/part?id=1"), "url")).toBe("https://example.com/part?id=1");
    expect(optionalHttpUrl(form("example.com/part"), "url")).toBe("https://example.com/part");
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "ftp://example.com/x"]) {
      expect(() => optionalHttpUrl(form(bad), "url")).toThrow();
    }
  });
});

describe("content security policy", () => {
  it("only lets scripts with this request's nonce run, and keeps LAN http access working", async () => {
    const { buildContentSecurityPolicy, createNonce } = await import("@/lib/security/csp");
    const nonce = createNonce();
    expect(nonce).not.toBe(createNonce());
    const policy = buildContentSecurityPolicy(nonce);
    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(buildContentSecurityPolicy(nonce, { development: true })).toContain("'unsafe-eval'");
  });
});

describe("backup streaming and restore limits", () => {
  afterEach(() => {
    delete process.env.CARVEY_MAX_RESTORE_MB;
  });

  it("writes a backup straight to a file that restores", async () => {
    const dir = await freshDataDir("carvey-audit-stream-");
    const db = await import("@/lib/db");
    const backup = await import("@/lib/backup");
    const paths = await import("@/lib/paths");
    db.createVehicle(vehicleInput());
    paths.ensureDataDirs();
    await fs.writeFile(path.join(paths.vehiclePhotoDir, "car.webp"), "image-bytes");
    const target = path.join(dir, "backup.zip");
    const manifest = await backup.writeBackupFile(target);
    expect(manifest.uploads).toEqual(["vehicles/car.webp"]);
    const staged = await backup.stageRestorePreview(new File([new Uint8Array(await fs.readFile(target))], "b.zip", { type: "application/zip" }));
    expect(staged).toMatchObject({ ok: true, summary: { counts: { vehicles: 1 }, uploadCount: 1 } });
    // No temporary database copies are left behind.
    expect((await fs.readdir(paths.tempDir)).filter((name) => name.startsWith("backup-"))).toEqual([]);
  });

  it("refuses a small zip that would expand far beyond the restore limit", async () => {
    await freshDataDir("carvey-audit-bomb-");
    process.env.CARVEY_MAX_RESTORE_MB = "1";
    const AdmZip = (await import("adm-zip")).default;
    const backup = await import("@/lib/backup");
    const zip = new AdmZip((await backup.createBackupZip()).buffer);
    zip.addFile("uploads/zeros.bin", Buffer.alloc(5 * 1024 * 1024));
    const buffer = zip.toBuffer();
    expect(buffer.length).toBeLessThan(1024 * 1024);
    const result = await backup.stageRestorePreview(new File([new Uint8Array(buffer)], "b.zip", { type: "application/zip" }));
    expect(result).toEqual({ ok: false, message: "Backup expands to more data than Carvey will restore at once." });
  });
});

describe("daily notification digest", () => {
  it("sends once when 'Check now' overlaps a scheduler tick", async () => {
    await freshDataDir("carvey-audit-digest-");
    const db = await import("@/lib/db");
    const notifications = await import("@/lib/notifications");
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    db.createReminder({ vehicleId, title: "Tax", dueDate: "2020-01-01", dueOdometer: null, recurrence: null });
    notifications.updateNotificationSettings({ enabled: true, provider: "webhook", url: "https://hooks.example.com/x", leadDays: 14, hour: 0 });
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response("ok");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const [tick, button] = await Promise.all([notifications.runDailyNotifications(), notifications.runDailyNotifications({ force: true })]);
      expect(tick.status).toBe("sent");
      expect(button.status).toBe("sent");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("automatic backups", () => {
  it("runs once a night after 03:00, keeps the newest N and can be turned off", async () => {
    await freshDataDir("carvey-audit-nightly-");
    const db = await import("@/lib/db");
    const scheduled = await import("@/lib/scheduled-backups");
    db.createVehicle(vehicleInput());
    expect(scheduled.getScheduledBackupSettings()).toMatchObject({ enabled: true, keep: 3 });

    const at = (date: string, hour: number) => {
      const value = new Date(`${date}T00:00:00`);
      value.setHours(hour);
      return value;
    };
    await expect(scheduled.runScheduledBackup({ now: at("2026-01-01", 2) })).resolves.toEqual({ status: "not-yet" });
    for (const day of ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]) {
      await expect(scheduled.runScheduledBackup({ now: at(day, 4) })).resolves.toEqual({ status: "done" });
    }
    await expect(scheduled.runScheduledBackup({ now: at("2026-01-04", 5) })).resolves.toEqual({ status: "already-ran" });
    expect((await scheduled.listScheduledBackups()).map((file) => file.name)).toEqual([
      "carvey-backup-2026-01-04.zip", "carvey-backup-2026-01-03.zip", "carvey-backup-2026-01-02.zip"
    ]);

    scheduled.updateScheduledBackupSettings({ enabled: false, keep: 7 });
    await expect(scheduled.runScheduledBackup({ now: at("2026-01-05", 4) })).resolves.toEqual({ status: "disabled" });
  });

  it("only serves file names it created", async () => {
    const { scheduledBackupPath } = await import("@/lib/scheduled-backups");
    expect(scheduledBackupPath("carvey-backup-2026-01-04.zip")).toMatch(/backups[/\\]carvey-backup-2026-01-04\.zip$/);
    for (const bad of ["../carvey.sqlite", "carvey-backup-2026-01-04.zip/../../x", "other.zip", ""]) expect(scheduledBackupPath(bad)).toBeNull();
  });
});

describe("data directory clean-up", () => {
  it("removes stale staging and work files and keeps the newest 3 rollbacks", async () => {
    await freshDataDir("carvey-audit-cleanup-");
    const paths = await import("@/lib/paths");
    const { cleanUpDataDirectory } = await import("@/lib/housekeeping");
    paths.ensureDataDirs();
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const make = async (dir: string, age: Date | null) => {
      await fs.mkdir(dir, { recursive: true });
      if (age) await fs.utimes(dir, age, age);
    };
    await make(path.join(paths.restoreStagingDir, "old-preview"), old);
    await make(path.join(paths.restoreStagingDir, "fresh-preview"), null);
    await make(path.join(paths.tempDir, "backup-abandoned"), old);
    for (const stamp of ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01"]) await make(path.join(paths.restoreRollbackDir, `${stamp}T10-00-00-000Z`), null);

    await cleanUpDataDirectory();
    expect(await fs.readdir(paths.restoreStagingDir)).toEqual(["fresh-preview"]);
    expect((await fs.readdir(paths.tempDir)).filter((name) => name.startsWith("backup-"))).toEqual([]);
    expect((await fs.readdir(paths.restoreRollbackDir)).sort()).toEqual(["2026-03-01T10-00-00-000Z", "2026-04-01T10-00-00-000Z", "2026-05-01T10-00-00-000Z"]);
  });
});

describe("health check", () => {
  it("reports healthy when the database answers and the data folder is writable", async () => {
    await freshDataDir("carvey-audit-health-");
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, app: "carvey" });
  });

  it("reports unhealthy (503, no detail) when the database can't be read", async () => {
    await freshDataDir("carvey-audit-health-down-");
    vi.doMock("@/lib/db", () => ({ getDb: () => { throw new Error("SQLITE_CANTOPEN"); } }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { GET } = await import("@/app/api/health/route");
      const response = await GET();
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ ok: false, app: "carvey" });
    } finally {
      errorSpy.mockRestore();
      vi.doUnmock("@/lib/db");
    }
  });
});

describe("restoring while signed in", () => {
  it("keeps the session that ran the restore, and only that one", async () => {
    await freshDataDir("carvey-audit-restore-session-");
    const db = await import("@/lib/db");
    const backup = await import("@/lib/backup");
    const adminId = Number(db.createAdminUser("owner", await bcrypt.hash("pw-123456", 4)).lastInsertRowid);
    db.createVehicle(vehicleInput());
    const { buffer } = await backup.createBackupZip();
    db.createAuthSession("a".repeat(48), adminId, new Date(Date.now() + 86_400_000).toISOString(), "Mine");
    db.createAuthSession("b".repeat(48), adminId, new Date(Date.now() + 86_400_000).toISOString(), "Other");
    const mine = db.hashToken("a".repeat(48));

    const staged = await backup.stageRestorePreview(new File([new Uint8Array(buffer)], "b.zip", { type: "application/zip" }));
    if (!staged.ok) throw new Error(staged.message);
    await expect(backup.confirmRestore(staged.summary.token, { keepSessionId: mine })).resolves.toMatchObject({ ok: true });

    expect(db.getAuthSession("a".repeat(48))).toMatchObject({ id: mine, adminUserId: adminId, revokedAt: null });
    expect(db.getAuthSession("b".repeat(48))).toBeUndefined();
  });
});

describe("audit log", () => {
  it("records events with the client and keeps them out of backups and restores", async () => {
    await freshDataDir("carvey-audit-log-");
    headerMock.get.mockImplementation((name: string) => (name === "x-forwarded-for" ? "198.51.100.4" : name === "user-agent" ? "Mozilla/5.0 (iPhone) Safari/605" : null));
    const db = await import("@/lib/db");
    const backup = await import("@/lib/backup");
    const { audit } = await import("@/lib/audit");
    db.createVehicle(vehicleInput());
    await audit("login.failed", "admin");
    expect(db.listAuditEntries()).toMatchObject([{ event: "login.failed", detail: "admin", client: "198.51.100.4", userAgent: "Mozilla/5.0 (iPhone) Safari/605" }]);

    const { buffer } = await backup.createBackupZip();
    const AdmZip = (await import("adm-zip")).default;
    const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-audit-log-zip-"));
    new AdmZip(buffer).extractAllTo(extractDir);
    const Database = (await import("better-sqlite3")).default;
    const copy = new Database(path.join(extractDir, "carvey.sqlite"), { readonly: true });
    expect(copy.prepare("SELECT COUNT(*) AS n FROM audit_log").get()).toEqual({ n: 0 });
    copy.close();

    await audit("login.ok", "admin");
    const staged = await backup.stageRestorePreview(new File([new Uint8Array(buffer)], "b.zip", { type: "application/zip" }));
    if (!staged.ok) throw new Error(staged.message);
    await backup.confirmRestore(staged.summary.token);
    expect(db.listAuditEntries().map((entry) => entry.event)).toEqual(["login.ok", "login.failed"]);
  });
});

describe("record tab paging", () => {
  it("shows 50 rows, then 50 more per step, never more than exist", async () => {
    const { paginate, recordPageSize } = await import("@/app/vehicles/[id]/_sections/shared");
    const rows = Array.from({ length: 120 }, (_, index) => index);
    expect(recordPageSize).toBe(50);
    expect(paginate(rows, {})).toMatchObject({ shown: 50, total: 120 });
    expect(paginate(rows, { show: "100" }).items).toHaveLength(100);
    expect(paginate(rows, { show: "500" })).toMatchObject({ shown: 120 });
    expect(paginate(rows, { show: "-3" }).shown).toBe(50);
    expect(paginate(rows.slice(0, 10), {}).shown).toBe(10);
  });
});

describe("gallery thumbnails", () => {
  it("makes a small thumbnail on upload, backfills old photos and deletes it with the photo", async () => {
    const dir = await freshDataDir("carvey-audit-thumbs-");
    vi.doMock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: 1 })) }));
    const sharp = (await import("sharp")).default;
    const db = await import("@/lib/db");
    const paths = await import("@/lib/paths");
    const uploads = await import("@/lib/uploads");
    const { POST } = await import("@/app/api/gallery-photos/route");
    const { deleteGalleryPhotoAction } = await import("@/app/actions/media");
    const vehicleId = Number(db.createVehicle(vehicleInput()).lastInsertRowid);
    const jpeg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#3366aa" } }).jpeg({ quality: 95 }).toBuffer();

    const form = new FormData();
    form.set("vehicleId", String(vehicleId));
    form.set("file", new File([new Uint8Array(jpeg)], "car.jpg", { type: "image/jpeg" }));
    const response = await POST(new Request("http://carvey.test/api/gallery-photos", { method: "POST", headers: { host: "carvey.test", origin: "http://carvey.test" }, body: form }));
    expect(response.status).toBe(303);
    const [photo] = db.listVehicleGalleryPhotos(vehicleId);
    expect(uploads.hasThumbnail(photo.filePath)).toBe(true);
    const thumbDisk = path.join(dir, uploads.thumbnailPathFor(photo.filePath).replace(/^\//, ""));
    const meta = await sharp(thumbDisk).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(480);

    // An image uploaded before thumbnails existed gets one from the daily clean-up.
    const legacy = path.join(paths.attachmentDir, String(vehicleId), "legacy.png");
    await fs.writeFile(legacy, await sharp({ create: { width: 900, height: 900, channels: 3, background: "#aa3333" } }).png().toBuffer());
    await expect(uploads.backfillThumbnails()).resolves.toBe(1);
    await expect(fs.access(`${legacy}.thumb.webp`)).resolves.toBeUndefined();

    const deleteForm = new FormData();
    deleteForm.set("photoId", String(photo.id));
    await deleteGalleryPhotoAction(vehicleId, deleteForm);
    await expect(fs.access(thumbDisk)).rejects.toThrow();
  });
});
