import { MAX_CADENCE_DAYS, parseCadenceDays } from "@memoir/core";
import { useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

type DefaultCadenceFormProps = {
  days: number;
  /** Resolves to an error message, or null when the save worked. */
  onSave: (days: number) => Promise<string | null>;
};

export function DefaultCadenceForm({ days, onSave }: DefaultCadenceFormProps) {
  const [draft, setDraft] = useState(String(days));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const parsed = parseCadenceDays(draft.trim() === "" ? null : Number(draft));

    if (!parsed.ok) {
      setError(parsed.message);

      return;
    }

    setError(null);
    setSaving(true);

    try {
      const message = await onSave(parsed.days);

      setError(message);
      setSaved(message === null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-caption text-ink-mute" htmlFor="default-cadence-days">
          Days between catch-ups
        </label>
        <Input
          className="w-24"
          id="default-cadence-days"
          inputMode="numeric"
          max={MAX_CADENCE_DAYS}
          min={1}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          type="number"
          value={draft}
        />
        <Button disabled={saving} type="submit">
          {saving ? "Saving…" : "Save Cadence"}
        </Button>
      </div>
      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
      )}
      {saved && <p className="text-caption text-ink-mute">Saved.</p>}
    </form>
  );
}
