import type { ImportantDateInput } from "@memoir/core";
import { useId, useState, type FormEvent } from "react";

import { todayIsoDay } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type ImportantDateFormProps = {
  error: string | null;
  onSubmit: (values: ImportantDateInput) => Promise<void>;
};

export function ImportantDateForm({ error, onSubmit }: ImportantDateFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [fallsOn, setFallsOn] = useState(todayIsoDay());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({ name, fallsOn });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-name`}>
          Important date
        </label>
        <Input
          id={`${id}-name`}
          onChange={(event) => setName(event.target.value)}
          placeholder="First met"
          required
          value={name}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-falls-on`}>
          Date
        </label>
        <Input
          id={`${id}-falls-on`}
          onChange={(event) => setFallsOn(event.target.value)}
          required
          type="date"
          value={fallsOn}
        />
      </div>

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button disabled={submitting} type="submit">
          {submitting ? "Saving the date" : "Add important date"}
        </Button>
      </div>
    </form>
  );
}
