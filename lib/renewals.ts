import { RENEWAL_TYPES, type RenewalType } from "./db/types";

/** Labels and defaults for renewal types. Pure, so it is safe to import from client components. */
export const renewalTypeLabels: Record<RenewalType, string> = {
  insurance: "Insurance",
  "road-tax": "Road tax",
  warranty: "Warranty",
  breakdown: "Breakdown cover",
  other: "Other renewal"
};

export const renewalTypeOptions = RENEWAL_TYPES.map((type) => ({ value: type, label: renewalTypeLabels[type] }));

export function isRenewalType(value: string): value is RenewalType {
  return (RENEWAL_TYPES as readonly string[]).includes(value);
}

export function renewalReminderTitle(type: RenewalType) {
  return type === "other" ? "Renewal due" : `${renewalTypeLabels[type]} renewal`;
}
