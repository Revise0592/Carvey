"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="primary-button print-hide" type="button" onClick={() => window.print()}>
      <Printer size={17} />
      Print / save PDF
    </button>
  );
}
