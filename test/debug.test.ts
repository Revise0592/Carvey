import { afterEach, describe, expect, it } from "vitest";
import { debugEasterEggsEnabled } from "@/lib/debug";

describe("debug easter egg flag", () => {
  const originalValue = process.env.CARVEY_DEBUG_EASTER_EGGS;

  afterEach(() => {
    process.env.CARVEY_DEBUG_EASTER_EGGS = originalValue;
  });

  it("is disabled by default", () => {
    delete process.env.CARVEY_DEBUG_EASTER_EGGS;
    expect(debugEasterEggsEnabled()).toBe(false);
  });

  it("accepts common truthy values", () => {
    for (const value of ["1", "true", "yes", "on"]) {
      process.env.CARVEY_DEBUG_EASTER_EGGS = value;
      expect(debugEasterEggsEnabled()).toBe(true);
    }
  });
});
