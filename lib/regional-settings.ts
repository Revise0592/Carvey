import { getAppSetting, setAppSetting } from "./db";

export type RegionalSettings = {
  currency: "GBP" | "USD" | "EUR";
  motFeature: "mot" | "emissionsTest" | "disabled";
  dateFormat: "dd-mon-yyyy" | "iso";
  distanceUnit: "miles" | "km";
  plateStyle: "uk-yellow" | "uk-white";
  authDisabled: boolean;
};

export function getRegionalSettings(): RegionalSettings {
  return {
    currency: (getAppSetting("currency") as RegionalSettings["currency"]) ?? "GBP",
    motFeature: (getAppSetting("motFeature") as RegionalSettings["motFeature"]) ?? "mot",
    dateFormat: (getAppSetting("dateFormat") as RegionalSettings["dateFormat"]) ?? "dd-mon-yyyy",
    distanceUnit: (getAppSetting("distanceUnit") as RegionalSettings["distanceUnit"]) ?? "miles",
    plateStyle: (getAppSetting("plateStyle") as RegionalSettings["plateStyle"]) ?? "uk-yellow",
    authDisabled: getAppSetting("authDisabled") === "true"
  };
}

export function updateRegionalSettings(input: Partial<RegionalSettings>) {
  if (input.currency !== undefined) setAppSetting("currency", input.currency);
  if (input.motFeature !== undefined) setAppSetting("motFeature", input.motFeature);
  if (input.dateFormat !== undefined) setAppSetting("dateFormat", input.dateFormat);
  if (input.distanceUnit !== undefined) setAppSetting("distanceUnit", input.distanceUnit);
  if (input.plateStyle !== undefined) setAppSetting("plateStyle", input.plateStyle);
  if (input.authDisabled !== undefined) setAppSetting("authDisabled", input.authDisabled ? "true" : "false");
}
