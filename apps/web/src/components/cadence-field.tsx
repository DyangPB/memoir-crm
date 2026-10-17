import { MAX_CADENCE_DAYS, parseCadenceDays, type CadenceSettings } from "@memoir/core";
import { useState } from "react";

import { Input } from "./ui/input";
import { Select } from "./ui/select";

type CadenceFieldProps = {
  /** The user's global Cadence, which a Contact follows unless it overrides it. */
  defaultDays: number;
  value: CadenceSettings;
  onChange: (value: CadenceSettings) => void;
};

type Mode = "default" | "custom" | "off";

function modeOf(value: CadenceSettings): Mode {
  if (!value.cadenceTracked) {
    return "off";
  }

  return value.cadenceDays === null ? "default" : "custom";
}

function parseDays(text: string): number | null {
  const parsed = parseCadenceDays(text.trim() === "" ? null : Number(text));

  return parsed.ok ? parsed.days : null;
}

export function CadenceField({ defaultDays, value, onChange }: CadenceFieldProps) {
  const mode = modeOf(value);
  // The days box can be briefly empty while typing; the saved value stays the last valid one.
  const [draft, setDraft] = useState(String(value.cadenceDays ?? defaultDays));

  function handleModeChange(next: Mode) {
    if (next === "default") {
      onChange({ cadenceDays: null, cadenceTracked: true });
    } else if (next === "off") {
      onChange({ cadenceDays: null, cadenceTracked: false });
    } else {
      const days = parseDays(draft);

      onChange({ cadenceDays: days ?? defaultDays, cadenceTracked: true });
    }
  }

  function handleDaysChange(text: string) {
    setDraft(text);

    const days = parseDays(text);

    if (days !== null) {
      onChange({ cadenceDays: days, cadenceTracked: true });
    }
  }

  // Leaving the box empty or invalid snaps it back to the value that will be saved.
  function handleDaysBlur() {
    if (parseDays(draft) === null) {
      setDraft(String(value.cadenceDays ?? defaultDays));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-caption text-ink-mute" htmlFor="contact-cadence">
        Cadence
      </label>
      <Select
        id="contact-cadence"
        onChange={(event) => handleModeChange(event.target.value as Mode)}
        value={mode}
      >
        <option value="default">Use my default (every {defaultDays} days)</option>
        <option value="custom">Choose my own</option>
        <option value="off">Don't track a Cadence</option>
      </Select>
      {mode === "custom" && (
        <div className="flex items-center gap-2">
          <label className="text-caption text-ink-mute" htmlFor="contact-cadence-days">
            Days between catch-ups
          </label>
          <Input
            className="w-24"
            id="contact-cadence-days"
            inputMode="numeric"
            max={MAX_CADENCE_DAYS}
            min={1}
            onBlur={handleDaysBlur}
            onChange={(event) => handleDaysChange(event.target.value)}
            type="number"
            value={draft}
          />
        </div>
      )}
    </div>
  );
}
