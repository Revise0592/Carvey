export type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  photoPath: string | null;
  thumbnailPath: string | null;
  notes: string | null;
  debugDestroyed: number;
  archived: number;
  sold: number;
  effectiveOdometer: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  category: string;
  description: string;
  garage: string | null;
  workshopId: number | null;
  cost: number;
  notes: string | null;
  createdAt: string;
};

export type MaintenanceCategory = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RepairRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  fault: string;
  garage: string | null;
  workshopId: number | null;
  cost: number;
  notes: string | null;
  createdAt: string;
};

export type MotRecord = {
  id: number;
  vehicleId: number;
  testDate: string;
  expiryDate: string;
  odometer: number | null;
  result: "pass" | "fail" | "advisory";
  advisories: string | null;
  cost: number;
  certificateRef: string | null;
  createdAt: string;
};

export type Reminder = {
  id: number;
  vehicleId: number;
  title: string;
  dueDate: string | null;
  dueOdometer: number | null;
  recurrence: string | null;
  completedAt: string | null;
  /** Set when the reminder is managed by a renewal (insurance, road tax, ...) of this type. */
  renewalType?: RenewalType | null;
  createdAt: string;
};

export type PlannedPurchase = {
  id: number;
  vehicleId: number;
  itemName: string;
  quantity: number;
  estimatedCost: number;
  actualCost: number | null;
  supplier: string | null;
  url: string | null;
  dueDate: string | null;
  dueOdometer: number | null;
  notes: string | null;
  reminderId: number | null;
  purchasedDate: string | null;
  convertedToType: "maintenance" | "repair" | null;
  convertedRecordId: number | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
  totpSecret?: string | null;
  totpEnabledAt?: string | null;
  totpLastCounter?: number | null;
  totpPendingSecret?: string | null;
  /** JSON array of SHA-256 hashes of unused recovery codes. */
  recoveryCodes?: string | null;
};

export type AttachmentRecordType = "maintenance" | "repair" | "mot" | "renewal";

export type RecordAttachment = {
  id: number;
  recordType: AttachmentRecordType;
  recordId: number;
  vehicleId: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
};

export type GalleryPhoto = {
  id: number;
  vehicleId: number;
  recordType: "maintenance" | "repair" | "mot" | null;
  recordId: number | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  caption: string | null;
  createdAt: string;
};

export type AuthSession = {
  id: string;
  adminUserId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent?: string | null;
  lastSeenAt?: string | null;
};

export type FuelRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number;
  volumeLitres: number;
  totalCost: number | null;
  fuelType: string;
  fullTank: number;
  station: string | null;
  notes: string | null;
  createdAt: string;
};

export type Workshop = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInterval = {
  id: number;
  name: string;
  intervalMonths: number | null;
  intervalMileage: number | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleServiceInterval = {
  id: number;
  vehicleId: number;
  serviceIntervalId: number;
  lastServiceDate: string | null;
  lastServiceOdometer: number | null;
  reminderId: number | null;
  createdAt: string;
  updatedAt: string;
  name: string;
  intervalMonths: number | null;
  intervalMileage: number | null;
};

export const RENEWAL_TYPES = ["insurance", "road-tax", "warranty", "breakdown", "other"] as const;
export type RenewalType = (typeof RENEWAL_TYPES)[number];

export type Renewal = {
  id: number;
  vehicleId: number;
  type: RenewalType;
  provider: string | null;
  reference: string | null;
  startDate: string | null;
  endDate: string;
  cost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OdometerReading = {
  vehicleId: number;
  date: string;
  odometer: number;
};
