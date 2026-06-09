import { getAppSetting, setAppSetting } from "./db";

export type RegionalSettings = {
  currency: "GBP" | "USD";
  registrationLabel: "registration" | "plateNumber";
  motFeature: "mot" | "emissionsTest" | "disabled";
  dateFormat: "dd-mon-yyyy" | "iso";
  distanceUnit: "miles" | "km";
  authDisabled: boolean;
};

export function getRegionalSettings(): RegionalSettings {
  return {
    currency: (getAppSetting("currency") as RegionalSettings["currency"]) ?? "GBP",
    registrationLabel: (getAppSetting("registrationLabel") as RegionalSettings["registrationLabel"]) ?? "registration",
    motFeature: (getAppSetting("motFeature") as RegionalSettings["motFeature"]) ?? "mot",
    dateFormat: (getAppSetting("dateFormat") as RegionalSettings["dateFormat"]) ?? "dd-mon-yyyy",
    distanceUnit: (getAppSetting("distanceUnit") as RegionalSettings["distanceUnit"]) ?? "miles",
    authDisabled: getAppSetting("authDisabled") === "true"
  };
}

export function updateRegionalSettings(input: Partial<RegionalSettings>) {
  if (input.currency !== undefined) setAppSetting("currency", input.currency);
  if (input.registrationLabel !== undefined) setAppSetting("registrationLabel", input.registrationLabel);
  if (input.motFeature !== undefined) setAppSetting("motFeature", input.motFeature);
  if (input.dateFormat !== undefined) setAppSetting("dateFormat", input.dateFormat);
  if (input.distanceUnit !== undefined) setAppSetting("distanceUnit", input.distanceUnit);
  if (input.authDisabled !== undefined) setAppSetting("authDisabled", input.authDisabled ? "true" : "false");
}
