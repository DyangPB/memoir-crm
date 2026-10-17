import type { Contact, InteractionInput } from "@memoir/core";
import { useEffect, useId, useRef, useState } from "react";

import { createInteraction } from "../lib/api";
import { todayIsoDay } from "../lib/format";
import { Icon } from "./icon";
import { InteractionForm } from "./interaction-form";
import { Select } from "./ui/select";

type LogInteractionDialogProps = {
  contacts: Contact[];
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
};

function LogInteractionBody({
  titleId,
  contacts,
  onClose,
  onLogged,
}: Omit<LogInteractionDialogProps, "open"> & { titleId: string }) {
  const id = useId();
  const [contactId, setContactId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: InteractionInput) {
    if (contactId === "") {
      setError("Choose who you connected with.");

      return;
    }

    setError(null);
    const result = await createInteraction(contactId, values);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    onLogged();
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-headline-sm text-ink" id={titleId}>
          Log interaction
        </h2>
        <button
          aria-label="Close"
          className="-mr-2 -mt-1 flex size-9 items-center justify-center rounded-sm text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor={`${id}-contact`}>
          Who did you connect with?
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
      <InteractionForm
        error={error}
        initialValues={{ type: "call", occurredOn: todayIsoDay(), note: null }}
        onCancel={onClose}
        onSubmit={handleSubmit}
        pendingLabel="Logging…"
        submitLabel="Log interaction"
      />
    </div>
  );
}

export function LogInteractionDialog({
  contacts,
  open,
  onClose,
  onLogged,
}: LogInteractionDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-hairline bg-canvas p-6 shadow-panel backdrop:bg-ink/40"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      {open && (
        // Mounted only while open so each opening starts with a blank form.
        <LogInteractionBody
          contacts={contacts}
          onClose={onClose}
          onLogged={onLogged}
          titleId={titleId}
        />
      )}
    </dialog>
  );
}
