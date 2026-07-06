import { getAppSetting, setAppSetting } from "./db";

export const CURRENCY_CODES = Intl.supportedValuesOf("currency");

export type RegionalSettings = {
  currency: string;
  fuelVolumeUnit: "litres" | "gallons";
  motFeature: "mot" | "emissionsTest" | "disabled";
  dateFormat: "dd-mon-yyyy" | "iso";
  distanceUnit: "miles" | "km";
  plateStyle: "uk-yellow" | "uk-white";
  authDisabled: boolean;
  fuelDisabled: boolean;
};

export function getRegionalSettings(): RegionalSettings {
  const currency = getAppSetting("currency") ?? "GBP";
  return {
    currency,
    // Legacy installs never set fuelVolumeUnit explicitly; it used to be inferred from currency === "USD".
    fuelVolumeUnit: (getAppSetting("fuelVolumeUnit") as RegionalSettings["fuelVolumeUnit"]) ?? (currency === "USD" ? "gallons" : "litres"),
    motFeature: (getAppSetting("motFeature") as RegionalSettings["motFeature"]) ?? "mot",
    dateFormat: (getAppSetting("dateFormat") as RegionalSettings["dateFormat"]) ?? "dd-mon-yyyy",
    distanceUnit: (getAppSetting("distanceUnit") as RegionalSettings["distanceUnit"]) ?? "miles",
    plateStyle: (getAppSetting("plateStyle") as RegionalSettings["plateStyle"]) ?? "uk-yellow",
    authDisabled: getAppSetting("authDisabled") === "true",
    fuelDisabled: getAppSetting("fuelDisabled") === "true"
  };
}

export function updateRegionalSettings(input: Partial<RegionalSettings>) {
  if (input.currency !== undefined) setAppSetting("currency", input.currency);
  if (input.fuelVolumeUnit !== undefined) setAppSetting("fuelVolumeUnit", input.fuelVolumeUnit);
  if (input.motFeature !== undefined) setAppSetting("motFeature", input.motFeature);
  if (input.dateFormat !== undefined) setAppSetting("dateFormat", input.dateFormat);
  if (input.distanceUnit !== undefined) setAppSetting("distanceUnit", input.distanceUnit);
  if (input.plateStyle !== undefined) setAppSetting("plateStyle", input.plateStyle);
  if (input.authDisabled !== undefined) setAppSetting("authDisabled", input.authDisabled ? "true" : "false");
  if (input.fuelDisabled !== undefined) setAppSetting("fuelDisabled", input.fuelDisabled ? "true" : "false");
}
