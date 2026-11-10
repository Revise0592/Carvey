import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/csv";
import { matchColumns, normaliseMotResult, normaliseRenewalType, parseDateValue, parseNumberValue, parseRecordsCsv } from "@/lib/csv-records";

describe("CSV reading and writing", () => {
  it("handles quotes, escaped quotes, newlines in fields, CRLF and a BOM", () => {
    const text = '﻿date,description,notes\r\n2026-01-01,"Oil, filter","He said ""fine""\nsecond line"\r\n\r\n2026-02-01,Tyres,\r\n';
    expect(parseCsv(text)).toEqual([
      ["date", "description", "notes"],
      ["2026-01-01", "Oil, filter", 'He said "fine"\nsecond line'],
      ["2026-02-01", "Tyres", ""]
    ]);
  });

  it("detects semicolon and tab delimited exports", () => {
    expect(detectDelimiter("date;cost\n1;2")).toBe(";");
    expect(detectDelimiter("date\tcost")).toBe("\t");
    expect(parseCsv("date;cost\n2026-01-01;12,50")).toEqual([["date", "cost"], ["2026-01-01", "12,50"]]);
  });

  it("round-trips through toCsv and guards against formula injection", () => {
    const csv = toCsv(["a", "b"], [["x,y", '"q"'], ["=SUM(A1)", -5], [null, "line\nbreak"]]);
    expect(parseCsv(csv)).toEqual([["a", "b"], ["x,y", '"q"'], ["'=SUM(A1)", "-5"], ["", "line\nbreak"]]);
  });
});

describe("record CSV parsing", () => {
  it("parses dates in common formats", () => {
    expect(parseDateValue("2026-03-04")).toBe("2026-03-04");
    expect(parseDateValue("2026/3/4 10:15")).toBe("2026-03-04");
    expect(parseDateValue("03/04/2026")).toBe("2026-04-03");
    expect(parseDateValue("03/04/2026", "mdy")).toBe("2026-03-04");
    expect(parseDateValue("4.3.26")).toBe("2026-03-04");
    expect(parseDateValue("4 Mar 2026")).toBe("2026-03-04");
    expect(parseDateValue("04-Mar-2026")).toBe("2026-03-04");
    expect(parseDateValue("March 4th, 2026")).toBe("2026-03-04");
    expect(parseDateValue("31/02/2026")).toBeNull();
    expect(parseDateValue("soon")).toBeNull();
  });

  it("parses money and distances in common formats", () => {
    expect(parseNumberValue("£1,234.50")).toBe(1234.5);
    expect(parseNumberValue("1.234,50 €")).toBe(1234.5);
    expect(parseNumberValue("12,5")).toBe(12.5);
    expect(parseNumberValue("45,000 miles")).toBe(45000);
    expect(parseNumberValue("")).toBeNull();
    expect(parseNumberValue("n/a")).toBeNull();
  });

  it("matches headers by name and alias, preferring canonical names", () => {
    const { mapping, registrationIndex } = matchColumns("maintenance", ["Reg", "Date", "Mileage", "Service", "Price", "Description"]);
    expect(mapping).toMatchObject({ date: 1, odometer: 2, cost: 4, description: 5 });
    expect(registrationIndex).toBe(0);
  });

  it("normalises MOT results and renewal types", () => {
    expect(normaliseMotResult("PASS WITH ADVISORIES")).toBe("advisory");
    expect(normaliseMotResult("Failed")).toBe("fail");
    expect(normaliseMotResult(null)).toBe("pass");
    expect(normaliseMotResult("maybe")).toBeNull();
    expect(normaliseRenewalType("Road Tax")).toBe("road-tax");
    expect(normaliseRenewalType("VED")).toBe("road-tax");
    expect(normaliseRenewalType("Breakdown recovery")).toBe("breakdown");
    expect(normaliseRenewalType("Parking permit")).toBe("other");
  });

  it("reports rows with problems instead of dropping them silently", () => {
    const result = parseRecordsCsv("fuel", parseCsv([
      "date,mileage,litres,price,partial",
      "01/02/2026,10000,40.5,£60.10,no",
      "bad date,10300,41,61,",
      "15/02/2026,,30,40,yes",
      "20/02/2026,10600,0,1,"
    ].join("\n")), { dateOrder: "dmy" });
    expect(result.rows).toEqual([{
      line: 2,
      registration: null,
      values: { date: "2026-02-01", odometer: 10000, volume: 40.5, totalCost: 60.1, fuelType: "petrol", fullTank: true, station: null, notes: null }
    }]);
    expect(result.errors.map((e) => e.line)).toEqual([3, 4, 5]);
    expect(result.errors[0].message).toContain('"bad date" is not a date');
    expect(result.errors[1].message).toContain("odometer is required");
  });

  it("inverts a 'partial' column and fills MOT expiry and maintenance category defaults", () => {
    const fuel = parseRecordsCsv("fuel", parseCsv("date,odometer,volume,partial\n2026-01-01,1,2,yes"), { dateOrder: "dmy" });
    expect(fuel.rows[0].values.fullTank).toBe(false);
    const mots = parseRecordsCsv("mots", parseCsv("test date,result\n2026-05-10,Pass"), { dateOrder: "dmy" });
    expect(mots.rows[0].values).toMatchObject({ testDate: "2026-05-10", expiryDate: "2027-05-09", result: "pass" });
    const maintenance = parseRecordsCsv("maintenance", parseCsv("date,description\n2026-01-01,Wipers"), { dateOrder: "dmy" });
    expect(maintenance.rows[0].values.category).toBe("Imported");
  });

  it("names missing required columns", () => {
    const result = parseRecordsCsv("repairs", parseCsv("when,cost\n2026-01-01,5"), { dateOrder: "dmy" });
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toBe("Missing required column: fault.");
  });
});
