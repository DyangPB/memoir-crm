import {
  interactionTypeLabel,
  interactionTypes,
  type InteractionInput,
} from "@memoir/core";
import { useId, useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

type InteractionFormProps = {
  initialValues: InteractionInput;
  submitLabel: string;
  pendingLabel: string;
  error: string | null;
  onSubmit: (values: InteractionInput) => Promise<void>;
  onCancel?: () => void;
};

export function InteractionForm({
  initialValues,
  submitLabel,
  pendingLabel,
  error,
  onSubmit,
  onCancel,
}: InteractionFormProps) {
  const id = useId();
  const [type, setType] = useState(initialValues.type);
  const [occurredOn, setOccurredOn] = useState(initialValues.occurredOn);
  const [note, setNote] = useState(initialValues.note ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        type,
        occurredOn,
        note: note.trim() === "" ? null : note,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-caption text-ink-mute" htmlFor={`${id}-type`}>
            Type
          </label>
          <Select
            id={`${id}-type`}
            onChange={(event) => setType(event.target.value as InteractionInput["type"])}
            value={type}
          >
            {interactionTypes.map((option) => (
              <option key={option} value={option}>
                {interactionTypeLabel(option)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-caption text-ink-mute" htmlFor={`${id}-date`}>
            Date
          </label>
          <Input
            id={`${id}-date`}
            onChange={(event) => setOccurredOn(event.target.value)}
            required
            type="date"
            value={occurredOn}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-note`}>
          Note
        </label>
        <Textarea
          id={`${id}-note`}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What happened?"
          rows={2}
          value={note}
        />
      </div>

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button disabled={submitting} type="submit">
          {submitting ? pendingLabel : submitLabel}
        </Button>
        {onCancel !== undefined && (
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
