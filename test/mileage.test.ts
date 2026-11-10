import { describe, expect, it } from "vitest";
import { annualDistance, estimateDateForOdometer, estimateMileageRate, estimateOdometerOn, mileageRatesByVehicle, reminderTiming } from "@/lib/mileage";

describe("mileage estimates", () => {
  const steady = [
    { date: "2026-01-01", odometer: 10_000 },
    { date: "2026-04-11", odometer: 11_000 },
    { date: "2026-07-20", odometer: 12_000 }
  ];

  it("fits a daily rate to dated readings", () => {
    const rate = estimateMileageRate(steady)!;
    expect(rate.perDay).toBeCloseTo(10, 5);
    expect(rate.lastDate).toBe("2026-07-20");
    expect(rate.lastOdometer).toBe(12_000);
    expect(annualDistance(rate)).toBe(3700);
  });

  it("needs at least two readings a month apart", () => {
    expect(estimateMileageRate([])).toBeNull();
    expect(estimateMileageRate([{ date: "2026-01-01", odometer: 10 }])).toBeNull();
    expect(estimateMileageRate([{ date: "2026-01-01", odometer: 10 }, { date: "2026-01-10", odometer: 200 }])).toBeNull();
  });

  it("ignores flat or decreasing histories", () => {
    expect(estimateMileageRate([{ date: "2026-01-01", odometer: 500 }, { date: "2026-06-01", odometer: 500 }])).toBeNull();
    expect(estimateMileageRate([{ date: "2026-01-01", odometer: 900 }, { date: "2026-06-01", odometer: 500 }])).toBeNull();
  });

  it("keeps the highest reading when a day has several", () => {
    const rate = estimateMileageRate([...steady, { date: "2026-07-20", odometer: 11_990 }])!;
    expect(rate.lastOdometer).toBe(12_000);
  });

  it("prefers the last two years over older history", () => {
    const rate = estimateMileageRate([
      { date: "2018-01-01", odometer: 0 },
      { date: "2019-01-01", odometer: 20_000 },
      ...steady
    ])!;
    expect(rate.perDay).toBeCloseTo(10, 5);
    expect(rate.sampleSize).toBe(3);
  });

  it("projects dates and odometer readings", () => {
    const rate = estimateMileageRate(steady)!;
    expect(estimateDateForOdometer(rate, 13_000)).toBe("2026-10-28");
    expect(estimateDateForOdometer(rate, 11_500)).toBe("2026-05-31");
    expect(estimateDateForOdometer(rate, 1_000_000)).toBeNull();
    expect(estimateOdometerOn(rate, "2026-07-30")).toBe(12_100);
    expect(estimateOdometerOn(rate, "2026-01-01")).toBe(12_000);
  });

  it("uses whichever of the due date and mileage estimate comes first", () => {
    const rate = estimateMileageRate(steady)!;
    expect(reminderTiming({ dueDate: "2027-06-01", dueOdometer: 13_000 }, rate, "2026-08-01")).toEqual({
      effectiveDate: "2026-10-28",
      estimatedDate: "2026-10-28",
      probablyReached: false
    });
    expect(reminderTiming({ dueDate: "2026-09-01", dueOdometer: 13_000 }, rate, "2026-08-01")).toEqual({
      effectiveDate: "2026-09-01",
      estimatedDate: null,
      probablyReached: false
    });
    expect(reminderTiming({ dueDate: null, dueOdometer: 12_500 }, rate, "2026-09-10")).toMatchObject({ probablyReached: true });
    expect(reminderTiming({ dueDate: null, dueOdometer: 12_500 }, null)).toEqual({ effectiveDate: null, estimatedDate: null, probablyReached: false });
  });

  it("groups readings per vehicle", () => {
    const rates = mileageRatesByVehicle([
      ...steady.map((reading) => ({ ...reading, vehicleId: 1 })),
      { vehicleId: 2, date: "2026-01-01", odometer: 1 }
    ]);
    expect([...rates.keys()]).toEqual([1]);
  });
});
