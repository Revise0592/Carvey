import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format";

describe("format helpers", () => {
  it("formats plain dates and SQLite timestamps", () => {
    expect(formatDate("2026-05-20")).toBe("20 May 2026");
    expect(formatDate("2026-05-20 11:35:00")).toBe("20 May 2026");
  });
});
