import type { ReminderInput } from "@memoir/core";
import { useId, useState, type FormEvent } from "react";

import { todayIsoDay } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type ReminderFormProps = {
  error: string | null;
  onSubmit: (values: ReminderInput) => Promise<void>;
};

export function ReminderForm({ error, onSubmit }: ReminderFormProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const [dueOn, setDueOn] = useState(todayIsoDay());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({ body, dueOn });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-body`}>
          Reminder
        </label>
        <Input
          id={`${id}-body`}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Call Bob"
          required
          value={body}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-due`}>
          Due
        </label>
        <Input
          id={`${id}-due`}
          onChange={(event) => setDueOn(event.target.value)}
          required
          type="date"
          value={dueOn}
        />
      </div>

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button disabled={submitting} type="submit">
          {submitting ? "Saving the reminder" : "Add reminder"}
        </Button>
      </div>
    </form>
  );
}
