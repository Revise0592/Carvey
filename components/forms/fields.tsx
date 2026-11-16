"use client";

import { Gauge } from "lucide-react";

export function MileagePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="pill">
      <Gauge size={14} />
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
