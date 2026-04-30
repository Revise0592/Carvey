import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("account helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("requires the current password before changing password", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-account-"));
    process.env.CARVEY_DATA_DIR = dir;
    const db = await import("@/lib/db");
    const { changePasswordForAdmin } = await import("@/lib/account");
    const hash = await bcrypt.hash("old-password", 4);
    const userId = Number(db.createAdminUser("admin", hash).lastInsertRowid);

    await expect(changePasswordForAdmin(userId, "wrong-password", "new-password")).resolves.toBe(false);
    await expect(bcrypt.compare("old-password", db.getAdminById(userId)!.passwordHash)).resolves.toBe(true);

    await expect(changePasswordForAdmin(userId, "old-password", "new-password")).resolves.toBe(true);
    await expect(bcrypt.compare("new-password", db.getAdminById(userId)!.passwordHash)).resolves.toBe(true);
    db.closeDbForTests();
  });
});
