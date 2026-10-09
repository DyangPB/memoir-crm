import { useId, useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type NoteFormProps = {
  initialBody: string;
  submitLabel: string;
  pendingLabel: string;
  error: string | null;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
};

export function NoteForm({
  initialBody,
  submitLabel,
  pendingLabel,
  error,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const id = useId();
  const [body, setBody] = useState(initialBody);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit(body);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Textarea
        aria-label="Note"
        id={`${id}-body`}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What should you remember?"
        rows={3}
        value={body}
      />

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
