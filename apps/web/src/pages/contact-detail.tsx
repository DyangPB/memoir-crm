import {
  daysSince,
  importantDateYears,
  interactionTypeLabel,
  lastInteractionDate,
  validateAttachment,
  validatePhoto,
  type Contact,
  type FieldDefinition,
  type ImportantDate,
  type ImportantDateInput,
  type Interaction,
  type InteractionInput,
  type LabelSummary,
  type Note,
  type Reminder,
  type ReminderInput,
} from "@memoir/core";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router";

import { BackToParent } from "../components/back-to-parent";
import { ContactAvatar } from "../components/contact-avatar";
import { DaysSince } from "../components/days-since";
import { Icon } from "../components/icon";
import { ImportantDateForm } from "../components/important-date-form";
import { ImportantDateMarker } from "../components/important-date-marker";
import { AttachButton, AttachmentList } from "../components/interaction-attachments";
import { InteractionForm } from "../components/interaction-form";
import { LocalClock } from "../components/local-clock";
import { NoteForm } from "../components/note-form";
import { ReminderForm } from "../components/reminder-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  createImportantDate,
  createInteraction,
  createLabel,
  createNote,
  createReminder,
  deleteAttachment,
  deleteImportantDate,
  deleteInteraction,
  deletePhoto,
  deleteNote,
  deleteReminder,
  getContact,
  listContactImportantDates,
  listContactReminders,
  listFieldDefinitions,
  listInteractions,
  listLabels,
  listNotes,
  setContactLabels,
  tickReminder,
  updateInteraction,
  updateNote,
  uploadAttachment,
  uploadPhoto,
} from "../lib/api";
import { formatDay, todayForDayCounts, todayIsoDay } from "../lib/format";
import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";
import type { ContactsOutletContext } from "./contacts";

const typeGlyphs = {
  call: "call",
  meeting: "local_cafe",
  message: "chat_bubble_outline",
  other: "radio_button_unchecked",
} as const;

function CustomFieldValue({
  definition,
  value,
}: {
  definition: FieldDefinition;
  value: unknown;
}) {
  if (definition.type === "url" && typeof value === "string") {
    return (
      <a
        className="text-body-md text-primary hover:underline"
        href={value}
        rel="noreferrer"
        target="_blank"
      >
        {value}
      </a>
    );
  }

  if (definition.type === "date" && typeof value === "string") {
    return <p className="text-body-md text-ink-secondary">{formatDay(value)}</p>;
  }

  const text = Array.isArray(value)
    ? value.join(", ")
    : value === true
      ? "Yes"
      : value === false
        ? "No"
        : String(value);

  return <p className="whitespace-pre-wrap text-body-md text-ink-secondary">{text}</p>;
}

/** The right-hand pane of the Contacts split view: one Contact's profile, Timeline and Notes. */
/** Remounts per Contact, so nothing from the last one lingers while the next loads. */
export function ContactDetailPane() {
  const { id } = useParams();

  return <ContactDetailBody key={id} />;
}

function ContactDetailBody() {
  const { id } = useParams();
  const location = useLocation();
  const { refreshList } = useOutletContext<ContactsOutletContext>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDate[] | null>(null);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [confirmingInteractionId, setConfirmingInteractionId] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [confirmingNoteId, setConfirmingNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [confirmingReminderId, setConfirmingReminderId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [confirmingImportantDateId, setConfirmingImportantDateId] = useState<string | null>(null);
  const [importantDateError, setImportantDateError] = useState<string | null>(null);

  const [allLabels, setAllLabels] = useState<LabelSummary[] | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [addingLabel, setAddingLabel] = useState(false);
  const [togglingLabel, setTogglingLabel] = useState(false);

  useEffect(() => {
    if (id === undefined) {
      return;
    }

    let active = true;

    void Promise.all([
      getContact(id),
      listInteractions(id),
      listNotes(id),
      listContactReminders(id),
      listContactImportantDates(id),
      listLabels(),
      listFieldDefinitions(),
    ]).then(
      ([
        contactResult,
        interactionsResult,
        notesResult,
        remindersResult,
        importantDatesResult,
        labelsResult,
        fieldsResult,
      ]) => {
        if (!active) {
          return;
        }

        if (!contactResult.ok) {
          if (contactResult.status === 401) {
            void navigate("/login");
            return;
          }

          if (contactResult.status === 404) {
            void navigate("/app/contacts");
            return;
          }

          setLoadError(contactResult.message);
          return;
        }

        if (
          !interactionsResult.ok ||
          !notesResult.ok ||
          !remindersResult.ok ||
          !importantDatesResult.ok ||
          !labelsResult.ok ||
          !fieldsResult.ok
        ) {
          setLoadError("That didn't load. Refresh and try again.");
          return;
        }

        setContact(contactResult.value);
        setInteractions(interactionsResult.value);
        setNotes(notesResult.value);
        setReminders(remindersResult.value);
        setImportantDates(importantDatesResult.value);
        setAllLabels(labelsResult.value);
        setFieldDefinitions(fieldsResult.value);
      },
    );

    return () => {
      active = false;
    };
  }, [id, navigate]);

  // The list rail shows days-since, which an Interaction change moves.
  async function refreshInteractions() {
    if (id === undefined) {
      return;
    }

    const result = await listInteractions(id);

    if (result.ok) {
      setInteractions(result.value);
      refreshList();
    }
  }

  async function refreshNotes() {
    if (id === undefined) {
      return;
    }

    const result = await listNotes(id);

    if (result.ok) {
      setNotes(result.value);
    }
  }

  async function handleAddInteraction(values: InteractionInput) {
    if (id === undefined) {
      return;
    }

    const result = await createInteraction(id, values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setInteractionError(result.message);
      return;
    }

    setInteractionError(null);
    await refreshInteractions();
  }

  async function handleUpdateInteraction(interactionId: string, values: InteractionInput) {
    if (id === undefined) {
      return;
    }

    const result = await updateInteraction(id, interactionId, values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setInteractionError(result.message);
      return;
    }

    setInteractionError(null);
    setEditingInteractionId(null);
    await refreshInteractions();
  }

  async function handleDeleteInteraction(interactionId: string) {
    if (id === undefined) {
      return;
    }

    const result = await deleteInteraction(id, interactionId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setInteractionError(result.message);
      return;
    }

    setConfirmingInteractionId(null);
    await refreshInteractions();
  }

  async function handleAttach(interaction: Interaction, file: File) {
    if (id === undefined) {
      return;
    }

    const checked = validateAttachment({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (!checked.ok) {
      setInteractionError(checked.message);
      return;
    }

    setAttachingId(interaction.id);
    const result = await uploadAttachment(id, interaction.id, file);
    setAttachingId(null);

    if (!result.ok) {
      setInteractionError(result.message);
      return;
    }

    setInteractionError(null);
    await refreshInteractions();
  }

  async function handleRemoveAttachment(interaction: Interaction, attachmentId: string) {
    if (id === undefined) {
      return;
    }

    const result = await deleteAttachment(id, interaction.id, attachmentId);

    if (!result.ok && result.status !== 404) {
      setInteractionError(result.message);
      return;
    }

    setInteractionError(null);
    await refreshInteractions();
  }

  async function handlePhotoPick(file: File) {
    if (id === undefined) {
      return;
    }

    const checked = validatePhoto({ contentType: file.type, size: file.size });

    if (!checked.ok) {
      setPhotoError(checked.message);
      return;
    }

    setPhotoBusy(true);
    const result = await uploadPhoto(id, file);
    setPhotoBusy(false);

    if (!result.ok) {
      setPhotoError(result.message);
      return;
    }

    setPhotoError(null);
    setContact(result.value);
    refreshList();
  }

  async function handlePhotoRemove() {
    if (id === undefined) {
      return;
    }

    setPhotoBusy(true);
    const result = await deletePhoto(id);
    setPhotoBusy(false);

    if (!result.ok) {
      setPhotoError(result.message);
      return;
    }

    setPhotoError(null);
    setContact((current) => (current === null ? current : { ...current, photoVersion: null }));
    refreshList();
  }

  async function handleAddNote(body: string) {
    if (id === undefined) {
      return;
    }

    const result = await createNote(id, { body });

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setNoteError(result.message);
      return;
    }

    setNoteError(null);
    await refreshNotes();
  }

  async function handleUpdateNote(noteId: string, body: string) {
    if (id === undefined) {
      return;
    }

    const result = await updateNote(id, noteId, { body });

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setNoteError(result.message);
      return;
    }

    setNoteError(null);
    setEditingNoteId(null);
    await refreshNotes();
  }

  async function handleDeleteNote(noteId: string) {
    if (id === undefined) {
      return;
    }

    const result = await deleteNote(id, noteId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setNoteError(result.message);
      return;
    }

    setConfirmingNoteId(null);
    await refreshNotes();
  }

  async function refreshReminders() {
    if (id === undefined) {
      return;
    }

    const result = await listContactReminders(id);

    if (result.ok) {
      setReminders(result.value);
    }
  }

  async function handleAddReminder(values: ReminderInput) {
    if (id === undefined) {
      return;
    }

    const result = await createReminder(id, values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setReminderError(result.message);
      return;
    }

    setReminderError(null);
    await refreshReminders();
  }

  async function handleTickReminder(reminderId: string) {
    if (id === undefined) {
      return;
    }

    const result = await tickReminder(id, reminderId);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setReminderError(result.message);
      return;
    }

    setReminderError(null);
    await refreshReminders();
  }

  async function handleDeleteReminder(reminderId: string) {
    if (id === undefined) {
      return;
    }

    const result = await deleteReminder(id, reminderId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setReminderError(result.message);
      return;
    }

    setConfirmingReminderId(null);
    await refreshReminders();
  }

  async function refreshImportantDates() {
    if (id === undefined) {
      return;
    }

    const result = await listContactImportantDates(id);

    if (result.ok) {
      setImportantDates(result.value);
    }
  }

  async function handleAddImportantDate(values: ImportantDateInput) {
    if (id === undefined) {
      return;
    }

    const result = await createImportantDate(id, values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setImportantDateError(result.message);
      return;
    }

    setImportantDateError(null);
    await refreshImportantDates();
  }

  async function handleDeleteImportantDate(importantDateId: string) {
    if (id === undefined) {
      return;
    }

    const result = await deleteImportantDate(id, importantDateId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setImportantDateError(result.message);
      return;
    }

    setConfirmingImportantDateId(null);
    await refreshImportantDates();
  }

  async function applyLabelIds(labelIds: string[]) {
    if (contact === null) {
      return;
    }

    const result = await setContactLabels(contact.id, labelIds);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setContact(result.value);
    refreshList();
  }

  async function handleToggleLabel(labelId: string) {
    if (contact === null) {
      return;
    }

    setTogglingLabel(true);
    const current = contact.labels.map((label) => label.id);
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];

    await applyLabelIds(next);
    setTogglingLabel(false);
  }

  async function handleAddLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contact === null) {
      return;
    }

    const name = newLabelName.trim();

    if (name === "") {
      return;
    }

    setAddingLabel(true);
    const created = await createLabel(name);

    if (!created.ok) {
      setAddingLabel(false);

      if (created.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(created.message);
      return;
    }

    setAllLabels([...(allLabels ?? []), created.value]);
    setNewLabelName("");
    await applyLabelIds([...contact.labels.map((label) => label.id), created.value.id]);
    setAddingLabel(false);
  }

  const backToList = (
    <div className="md:hidden">
      <BackToParent label="Back to Contacts" to={`/app/contacts${location.search}`} />
    </div>
  );

  if (loadError !== null) {
    return (
      <div className="flex flex-col gap-3">
        {backToList}
        <p className="text-body-md text-ink-secondary">{loadError}</p>
      </div>
    );
  }

  if (
    contact === null ||
    interactions === null ||
    notes === null ||
    reminders === null ||
    importantDates === null ||
    fieldDefinitions === null
  ) {
    return (
      <div className="flex flex-col gap-3">
        {backToList}
        <p className="text-caption text-ink-mute">Fetching this contact</p>
      </div>
    );
  }

  const lastOn = lastInteractionDate(interactions);
  const days =
    lastOn === null
      ? null
      : daysSince(new Date(`${lastOn}T00:00:00.000Z`), todayForDayCounts());
  const now = new Date();
  const openReminders = reminders.filter((reminder) => reminder.status !== "done");
  const doneReminders = reminders.filter((reminder) => reminder.status === "done");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        {backToList}
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <ContactAvatar contact={contact} size="lg" />
            <div className="flex flex-col gap-1">
              <p className="text-micro-cap uppercase text-ink-mute">Contact</p>
              <h1 className="font-display text-display-lg text-ink">{contact.name}</h1>
              {(contact.roleCompany !== null || contact.location !== null) && (
                <p className="text-body-md text-ink-secondary">
                  {[contact.roleCompany, contact.location]
                    .filter((part): part is string => part !== null)
                    .join(" · ")}
                </p>
              )}
              {contact.timezone !== null && <LocalClock timezone={contact.timezone} />}
              <div className="-ml-4 flex items-center gap-1">
                <AttachButton
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  busy={photoBusy}
                  label={contact.photoVersion === null ? "Add photo" : "Change photo"}
                  onPick={(file) => void handlePhotoPick(file)}
                  pendingLabel="Uploading"
                />
                {contact.photoVersion !== null && (
                  <Button disabled={photoBusy} onClick={() => void handlePhotoRemove()} variant="ghost">
                    Remove photo
                  </Button>
                )}
              </div>
              {photoError !== null && (
                <p className="text-caption text-danger" role="alert">
                  {photoError}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            {days !== null && (
              <DaysSince
                className="flex-col items-end gap-0"
                days={days}
                numeralClassName="text-numeral"
                targetDays={contact.effectiveCadenceDays}
              />
            )}
            <Button asChild variant="secondary">
              <Link to={`/app/contacts/${contact.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-10 xl:grid-cols-[1fr_260px]">
        <section className="flex flex-col gap-5">
          <h2 className="text-heading-lg text-ink">Timeline</h2>

          <div className="rounded-lg border border-hairline bg-canvas-soft/50 p-4">
            <InteractionForm
              error={null}
              initialValues={{ type: "call", occurredOn: todayIsoDay(), note: null }}
              onSubmit={handleAddInteraction}
              pendingLabel="Logging the interaction"
              submitLabel="Log interaction"
            />
          </div>

          {interactionError !== null && (
            <p
              className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger"
              role="alert"
            >
              {interactionError}
            </p>
          )}

          {interactions.length === 0 ? (
            <p className="text-body-md text-ink-mute">
              Nothing logged yet. Add a call, a coffee, a message: anything that keeps the thread
              alive.
            </p>
          ) : (
            <ol className="relative flex flex-col gap-6">
              <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-0.5 bg-hairline" />
              {interactions.map((interaction) => {
                const glyph = typeGlyphs[interaction.type];

                return (
                  <li className="relative pl-10" key={interaction.id}>
                    <span className="absolute left-0 top-0 flex size-7 items-center justify-center rounded-full bg-primary-bg-subdued text-primary">
                      <Icon className="text-sm" name={glyph} />
                    </span>
                    {editingInteractionId === interaction.id ? (
                      <div className="rounded-lg border border-hairline p-4">
                        <InteractionForm
                          error={interactionError}
                          initialValues={{
                            type: interaction.type,
                            occurredOn: interaction.occurredOn,
                            note: interaction.note,
                          }}
                          onCancel={() => {
                            setEditingInteractionId(null);
                            setInteractionError(null);
                          }}
                          onSubmit={(values) => handleUpdateInteraction(interaction.id, values)}
                          pendingLabel="Saving changes"
                          submitLabel="Save changes"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-heading-sm text-ink">
                            {interactionTypeLabel(interaction.type)}
                          </span>
                          <span className="text-body-tabular tabular-nums text-ink-mute">
                            {formatDay(interaction.occurredOn)}
                          </span>
                        </div>
                        {interaction.note !== null && (
                          <p className="whitespace-pre-wrap text-body-md text-ink-secondary">
                            {interaction.note}
                          </p>
                        )}
                        <AttachmentList
                          attachments={interaction.attachments}
                          contactId={contact.id}
                          onRemove={(attachment) =>
                            void handleRemoveAttachment(interaction, attachment.id)
                          }
                        />
                        {confirmingInteractionId === interaction.id ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-caption text-ink-mute">
                              Delete this interaction?
                            </span>
                            <Button
                              onClick={() => handleDeleteInteraction(interaction.id)}
                              variant="danger"
                            >
                              Delete interaction
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmingInteractionId(null);
                              }}
                              variant="ghost"
                            >
                              Keep it
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <AttachButton
                              ariaLabel={`Attach file to ${interactionTypeLabel(interaction.type)} on ${formatDay(interaction.occurredOn)}`}
                              busy={attachingId === interaction.id}
                              onPick={(file) => void handleAttach(interaction, file)}
                            />
                            <Button
                              onClick={() => {
                                setEditingInteractionId(interaction.id);
                                setInteractionError(null);
                              }}
                              variant="ghost"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmingInteractionId(interaction.id);
                              }}
                              variant="ghost"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-heading-lg text-ink">Details</h2>
            {contact.emails.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p className="text-micro-cap uppercase text-ink-mute">Emails</p>
                {contact.emails.map((email) => (
                  <p className="text-body-md text-ink-secondary" key={email}>
                    {email}
                  </p>
                ))}
              </div>
            )}
            {contact.phones.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p className="text-micro-cap uppercase text-ink-mute">Phones</p>
                {contact.phones.map((phone) => (
                  <p className="text-body-md text-ink-secondary" key={phone}>
                    {phone}
                  </p>
                ))}
              </div>
            )}
            {contact.socialLinks.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p className="text-micro-cap uppercase text-ink-mute">Links</p>
                {contact.socialLinks.map((link) => (
                  <a
                    className="text-body-md text-primary hover:underline"
                    href={link.url}
                    key={link.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
            {contact.birthday !== null && (
              <div className="flex flex-col gap-0.5">
                <p className="text-micro-cap uppercase text-ink-mute">Birthday</p>
                <p className="text-body-md text-ink-secondary">{formatDay(contact.birthday)}</p>
              </div>
            )}
            {contact.howWeMet !== null && (
              <div className="flex flex-col gap-0.5">
                <p className="text-micro-cap uppercase text-ink-mute">How we met</p>
                <p className="whitespace-pre-wrap text-body-md text-ink-secondary">
                  {contact.howWeMet}
                </p>
              </div>
            )}
            {fieldDefinitions.map((definition) => {
              const value = contact.customFields[definition.id];

              if (
                value === undefined ||
                value === null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0)
              ) {
                return null;
              }

              return (
                <div className="flex flex-col gap-0.5" key={definition.id}>
                  <p className="text-micro-cap uppercase text-ink-mute">{definition.name}</p>
                  <CustomFieldValue definition={definition} value={value} />
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-heading-lg text-ink">Labels</h2>

            {contact.labels.length === 0 ? (
              <p className="text-caption text-ink-mute">No labels yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {contact.labels.map((label) => (
                  <span
                    className="rounded-full bg-primary-bg-subdued px-2 py-1 text-micro-cap uppercase text-primary"
                    key={label.id}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {allLabels !== null && allLabels.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {allLabels.map((label) => (
                  <label
                    className="flex items-center gap-2 text-body-md text-ink-secondary"
                    key={label.id}
                  >
                    <input
                      checked={contact.labels.some((item) => item.id === label.id)}
                      className="accent-primary"
                      disabled={togglingLabel}
                      onChange={() => void handleToggleLabel(label.id)}
                      type="checkbox"
                    />
                    {label.name}
                  </label>
                ))}
              </div>
            )}

            <form className="flex gap-2" onSubmit={handleAddLabel}>
              <Input
                aria-label="New label"
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="New label"
                value={newLabelName}
              />
              <Button disabled={addingLabel} type="submit" variant="secondary">
                {addingLabel ? "Adding" : "Add"}
              </Button>
            </form>

            {labelError !== null && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
                {labelError}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-lg text-ink">Reminders</h2>

            <ReminderForm error={reminderError} onSubmit={handleAddReminder} />

            {reminders.length === 0 ? (
              <p className="text-body-md text-ink-mute">
                No reminders yet. Add one, and it will be waiting on your home screen when the
                day comes.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {[...openReminders, ...doneReminders].map((reminder) => (
                  <li className="flex flex-col gap-1.5" key={reminder.id}>
                    <p
                      className={cn(
                        "text-body-md",
                        reminder.status === "done"
                          ? "text-ink-mute line-through"
                          : "text-ink-secondary",
                      )}
                    >
                      {reminder.body}
                    </p>
                    {reminder.status === "due" || reminder.status === "overdue" ? (
                      <span
                        className={cn(
                          "self-start rounded-full px-2 py-1 text-micro-cap uppercase tabular-nums",
                          reminderChipClass(reminder.status),
                        )}
                      >
                        {reminderTiming(reminder, now)}
                      </span>
                    ) : (
                      <span className="text-caption tabular-nums text-ink-mute">
                        {reminderTiming(reminder, now)}
                      </span>
                    )}
                    {confirmingReminderId === reminder.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-caption text-ink-mute">Delete this reminder?</span>
                        <Button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          variant="danger"
                        >
                          Delete reminder
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingReminderId(null);
                          }}
                          variant="ghost"
                        >
                          Keep it
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {reminder.status !== "done" && (
                          <Button onClick={() => handleTickReminder(reminder.id)} variant="ghost">
                            Mark done
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setConfirmingReminderId(reminder.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-lg text-ink">Important dates</h2>

            <ImportantDateForm
              error={importantDateError}
              onSubmit={handleAddImportantDate}
            />

            {importantDates.length === 0 ? (
              <p className="text-body-md text-ink-mute">
                No important dates yet. Add one here, and it comes around every year.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {importantDates.map((importantDate) => (
                  <li className="flex flex-col gap-1.5" key={importantDate.id}>
                    <p className="text-body-md text-ink-secondary">{importantDate.name}</p>
                    <span className="flex flex-wrap items-center gap-2">
                      <ImportantDateMarker fallsOn={importantDate.fallsOn} now={now} />
                      <span className="text-caption tabular-nums text-ink-mute">
                        {importantDateYears(importantDate.fallsOn, now)}{" "}
                        {importantDate.source === "birthday" ? "turning" : "years"}
                      </span>
                    </span>
                    {importantDate.source === "birthday" ? (
                      <p className="text-caption text-ink-mute">
                        Comes from this contact's birthday.
                      </p>
                    ) : confirmingImportantDateId === importantDate.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-caption text-ink-mute">
                          Delete "{importantDate.name}" from this contact? Other contacts keep
                          theirs.
                        </span>
                        <Button
                          onClick={() => handleDeleteImportantDate(importantDate.id)}
                          variant="danger"
                        >
                          Delete date
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingImportantDateId(null);
                          }}
                          variant="ghost"
                        >
                          Keep it
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setConfirmingImportantDateId(importantDate.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-lg text-ink">Notes</h2>
            <NoteForm
              error={noteError}
              initialBody=""
              onSubmit={handleAddNote}
              pendingLabel="Saving your note"
              submitLabel="Add note"
            />
            {notes.length === 0 ? (
              <p className="text-body-md text-ink-mute">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {notes.map((note) => (
                  <li className="flex flex-col gap-1.5" key={note.id}>
                    {editingNoteId === note.id ? (
                      <NoteForm
                        error={noteError}
                        initialBody={note.body}
                        onCancel={() => {
                          setEditingNoteId(null);
                          setNoteError(null);
                        }}
                        onSubmit={(body) => handleUpdateNote(note.id, body)}
                        pendingLabel="Saving changes"
                        submitLabel="Save changes"
                      />
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-body-md text-ink-secondary">
                          {note.body}
                        </p>
                        {confirmingNoteId === note.id ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-caption text-ink-mute">Delete this note?</span>
                            <Button onClick={() => handleDeleteNote(note.id)} variant="danger">
                              Delete note
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmingNoteId(null);
                              }}
                              variant="ghost"
                            >
                              Keep it
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setNoteError(null);
                              }}
                              variant="ghost"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmingNoteId(note.id);
                              }}
                              variant="ghost"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
