import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("safeUploadPath", () => {
  beforeEach(() => {
    process.env.CARVEY_DATA_DIR = "/tmp/carvey-test-data";
    vi.resetModules();
  });

  it("resolves normal upload paths inside the upload directory", async () => {
    const { safeUploadPath, uploadDir } = await import("@/lib/paths");

    expect(safeUploadPath(["vehicles", "car.webp"])).toBe(path.join(uploadDir, "vehicles", "car.webp"));
  });

  it("rejects traversal and suspicious path segments", async () => {
    const { safeUploadPath } = await import("@/lib/paths");

    expect(() => safeUploadPath([])).toThrow("Invalid upload path");
    expect(() => safeUploadPath(["..", "carvey.sqlite"])).toThrow("Invalid upload path");
    expect(() => safeUploadPath(["vehicles/../carvey.sqlite"])).toThrow("Invalid upload path");
    expect(() => safeUploadPath(["vehicles", "..", "carvey.sqlite"])).toThrow("Invalid upload path");
    expect(() => safeUploadPath(["vehicles", "nested\\evil.webp"])).toThrow("Invalid upload path");
    expect(() => safeUploadPath(["vehicles", ""])).toThrow("Invalid upload path");
  });
});
