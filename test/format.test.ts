import { describe, expect, it } from "vitest";
import { formatDate, formatMotResult, formatPlannedPurchaseStatus, formatReminderStatus } from "@/lib/format";

describe("format helpers", () => {
  it("formats plain dates and SQLite timestamps", () => {
    expect(formatDate("2026-05-20")).toBe("20 May 2026");
    expect(formatDate("2026-05-20 11:35:00")).toBe("20 May 2026");
  });

  it("formats MOT results for display", () => {
    expect(formatMotResult("pass")).toBe("Pass");
    expect(formatMotResult("fail")).toBe("Fail");
    expect(formatMotResult("advisory")).toBe("Pass with Advisories");
  });

  it("formats reminder statuses for display", () => {
    expect(formatReminderStatus("done")).toBe("Done");
    expect(formatReminderStatus("overdue")).toBe("Overdue");
    expect(formatReminderStatus("upcoming")).toBe("Upcoming");
    expect(formatReminderStatus("open")).toBe("Open");
  });

  it("formats planned purchase statuses for display", () => {
    expect(formatPlannedPurchaseStatus("to-buy")).toBe("To Buy");
    expect(formatPlannedPurchaseStatus("purchased")).toBe("Purchased");
    expect(formatPlannedPurchaseStatus("logged-as-maintenance")).toBe("Logged as Maintenance");
    expect(formatPlannedPurchaseStatus("logged-as-repair")).toBe("Logged as Repair");
  });
});
