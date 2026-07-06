import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatFuelEconomy, formatMiles, formatMotResult, formatPlannedPurchaseStatus, formatReminderStatus, formatVolume } from "@/lib/format";

describe("format helpers", () => {
  it("formats plain dates and SQLite timestamps", () => {
    expect(formatDate("2026-05-20")).toBe("20 May 2026");
    expect(formatDate("2026-05-20 11:35:00")).toBe("20 May 2026");
  });

  it("formats dates in ISO mode", () => {
    expect(formatDate("2026-05-20", { dateFormat: "iso" })).toBe("2026-05-20");
    expect(formatDate("2026-05-20 11:35:00", { dateFormat: "iso" })).toBe("2026-05-20");
    expect(formatDate(null, { dateFormat: "iso" })).toBe("Not set");
  });

  it("formats currency in USD mode", () => {
    expect(formatCurrency(100, { currency: "USD" })).toBe("$100.00");
    expect(formatCurrency(0, { currency: "USD" })).toBe("$0.00");
  });

  it("formats currency in EUR mode", () => {
    expect(formatCurrency(100, { currency: "EUR" })).toBe("€100.00");
    expect(formatCurrency(0, { currency: "EUR" })).toBe("€0.00");
  });

  it("formats currency in GBP mode (default)", () => {
    expect(formatCurrency(100)).toBe("£100.00");
    expect(formatCurrency(100, { currency: "GBP" })).toBe("£100.00");
  });

  it("formats currency for any ISO 4217 code", () => {
    expect(formatCurrency(100, { currency: "JPY" })).toBe("¥100");
    expect(formatCurrency(100, { currency: "CAD" })).toBe("CA$100.00");
  });

  it("uses fuelVolumeUnit, not currency, to decide litres vs gallons", () => {
    expect(formatVolume(10, { fuelVolumeUnit: "litres" })).toBe("10.00 L");
    expect(formatVolume(37.8541, { fuelVolumeUnit: "gallons" })).toBe("10.00 gal");
  });

  it("uses fuelVolumeUnit to pick mpg formula independent of currency", () => {
    expect(formatFuelEconomy(300, 37.8541, { fuelVolumeUnit: "gallons" })).toBe("30.0 mpg");
    expect(formatFuelEconomy(300, 37.8541, { fuelVolumeUnit: "litres" })).toBe("36.0 mpg");
    expect(formatFuelEconomy(300, 30, { distanceUnit: "km" })).toBe("10.0 L/100km");
  });

  it("formats distance in km mode", () => {
    expect(formatMiles(100000, { distanceUnit: "km" })).toBe("100,000 km");
    expect(formatMiles(0, { distanceUnit: "km" })).toBe("0 km");
    expect(formatMiles(null, { distanceUnit: "km" })).toBe("No distance");
  });

  it("formats distance in miles mode (default)", () => {
    expect(formatMiles(50000)).toBe("50,000 miles");
    expect(formatMiles(null)).toBe("No mileage");
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
