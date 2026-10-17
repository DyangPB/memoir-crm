import { parseQuickDate, type Contact, type ReminderInput } from "@memoir/core";
import { useId, useState, type FormEvent } from "react";

import { formatDay, todayIsoDay } from "../lib/format";
import { AirmailEdge } from "./airmail-edge";
import { Icon } from "./icon";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

type ReminderQuickAddProps = {
  contacts: Contact[];
  /** Resolves to an error message, or null once the Reminder is saved. */
  onAdd: (contactId: string, input: ReminderInput) => Promise<string | null>;
  /** The user's current day as an ISO day; defaults to their local today. */
  today?: string;
};

export function ReminderQuickAdd({ contacts, onAdd, today = todayIsoDay() }: ReminderQuickAddProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const [contactId, setContactId] = useState("");
  const [when, setWhen] = useState("");
  const [pickedDate, setPickedDate] = useState("");
  const [needsPicker, setNeedsPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const typed = parseQuickDate(when, today);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contactId === "") {
      setError("Choose who this reminder is for.");

      return;
    }

    const dueOn = typed.ok ? typed.dueOn : pickedDate;

    if (dueOn === "") {
      setNeedsPicker(true);
      setError(null);

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

      setBody("");
      setWhen("");
      setPickedDate("");
      setNeedsPicker(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-sm">
      <AirmailEdge />
      <form className="flex flex-col gap-3 p-4" noValidate onSubmit={handleSubmit}>
        <p className="flex items-center gap-2 text-heading-lg text-ink">
          <Icon className="text-primary-container" name="bookmark_add" />
          Add a reminder
        </p>
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
          <div className="flex flex-col gap-1.5 md:col-span-3">
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
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-4">
            <label className="text-caption text-ink-mute" htmlFor={`${id}-when`}>
              When
            </label>
            <Input
              id={`${id}-when`}
              onChange={(event) => setWhen(event.target.value)}
              placeholder="Oct 28 or in 3 days"
              value={when}
            />
            {typed.ok && when.trim() !== "" && (
              <span className="text-caption tabular-nums text-ink-mute">
                Scheduled {formatDay(typed.dueOn)}
              </span>
            )}
          </div>
        </div>

        {needsPicker && !typed.ok && (
          <div className="flex flex-col gap-1.5">
            <p className="text-caption text-ink-mute">I couldn't read that date. Pick one instead.</p>
            <label className="sr-only" htmlFor={`${id}-picked`}>
              Pick a date
            </label>
            <Input
              id={`${id}-picked`}
              onChange={(event) => setPickedDate(event.target.value)}
              type="date"
              value={pickedDate}
            />
          </div>
        )}

        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        <div>
          <Button disabled={submitting} type="submit">
            {submitting ? "Saving the reminder" : "Add reminder"}
          </Button>
        </div>
      </form>
    </section>
  );
}
