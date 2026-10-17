import type { Contact, ReminderInput } from "@memoir/core";
import { useEffect, useId, useState, type FormEvent } from "react";

import { AirmailEdge } from "./airmail-edge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

type CalendarAddReminderProps = {
  contacts: Contact[];
  /** The day the Reminder starts out dated: the Calendar's selected day. */
  day: string;
  /** Resolves to an error message, or null once the Reminder is saved. */
  onAdd: (contactId: string, input: ReminderInput) => Promise<string | null>;
  onClose: () => void;
};

export function CalendarAddReminder({ contacts, day, onAdd, onClose }: CalendarAddReminderProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueOn, setDueOn] = useState(day);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Picking another day moves the date along; what was typed stays.
  useEffect(() => {
    setDueOn(day);
  }, [day]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contactId === "") {
      setError("Choose who this reminder is for.");

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const failure = await onAdd(contactId, { body, dueOn });

      if (failure !== null) {
        setError(failure);

        return;
      }

      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-sm">
      <AirmailEdge />
      <form className="flex flex-col gap-3 p-4" noValidate onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="flex flex-col gap-1.5 md:col-span-5">
            <label className="text-caption text-ink-mute" htmlFor={`${id}-body`}>
              Reminder
            </label>
            <Input
              id={`${id}-body`}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Call Bob"
              value={body}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-4">
            <label className="text-caption text-ink-mute" htmlFor={`${id}-contact`}>
              Contact
            </label>
            <Select
              id={`${id}-contact`}
              onChange={(event) => setContactId(event.target.value)}
              value={contactId}
            >
              <option value="">Choose a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </Select>
            {contacts.length === 0 && (
              <span className="text-caption text-ink-mute">
                You have no contacts yet. Add one first, then come back.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-3">
            <label className="text-caption text-ink-mute" htmlFor={`${id}-date`}>
              Date
            </label>
            <Input
              id={`${id}-date`}
              onChange={(event) => setDueOn(event.target.value)}
              type="date"
              value={dueOn}
            />
          </div>
        </div>

        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button disabled={submitting} type="submit">
            {submitting ? "Saving the reminder" : "Save reminder"}
          </Button>
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
