"use client";

import { useState } from "react";

export function MotFeatureField({
  motFeature,
  motCustomLabel
}: {
  motFeature: string;
  motCustomLabel: string;
}) {
  const [value, setValue] = useState(motFeature);

  return (
    <>
      <label>
        Annual vehicle test
        <select name="motFeature" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="mot">MOT</option>
          <option value="inspection">Inspection</option>
          <option value="custom">Custom</option>
          <option value="disabled">Disabled (hide feature)</option>
        </select>
      </label>
      {value === "custom" ? (
        <label>
          Custom name
          <input
            name="motCustomLabel"
            type="text"
            defaultValue={motCustomLabel}
            placeholder="e.g. Kontroll, TÜV, Roadworthy Certificate"
            required
          />
        </label>
      ) : null}
    </>
  );
}
