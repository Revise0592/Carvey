import { describe, expect, it } from "vitest";
import { getReminderStatus } from "@/lib/reminders";

describe("getReminderStatus", () => {
  it("marks completed reminders as done", () => {
    expect(getReminderStatus({ completedAt: "2026-01-01", dueDate: null, dueOdometer: null }, { currentOdometer: null })).toBe("done");
  });

  it("marks mileage reminders overdue when current odometer has passed due mileage", () => {
    expect(getReminderStatus({ completedAt: null, dueDate: null, dueOdometer: 50000 }, { currentOdometer: 50001 })).toBe("overdue");
  });

  it("marks future reminders as upcoming", () => {
    expect(getReminderStatus({ completedAt: null, dueDate: "2999-01-01", dueOdometer: null }, { currentOdometer: null })).toBe("upcoming");
  });
});
