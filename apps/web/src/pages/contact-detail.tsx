import {
  daysSince,
  interactionTypeLabel,
  lastInteractionDate,
  type Contact,
  type Interaction,
  type InteractionInput,
  type Note,
} from "@memoir/core";
import { Circle, Coffee, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { AppHeader } from "../components/app-header";
import { InteractionForm } from "../components/interaction-form";
import { LetterAvatar } from "../components/letter-avatar";
import { NoteForm } from "../components/note-form";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import {
  createInteraction,
  createNote,
  deleteInteraction,
  deleteNote,
  getContact,
  listInteractions,
  listNotes,
  updateInteraction,
  updateNote,
} from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatDay, todayIsoDay } from "../lib/format";

const typeGlyphs = {
  call: Phone,
  meeting: Coffee,
  message: MessageCircle,
  other: Circle,
} as const;

export function ContactDetailPage() {
  const { id } = useParams();
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [confirmingInteractionId, setConfirmingInteractionId] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [confirmingNoteId, setConfirmingNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null || id === undefined) {
      return;
    }

    let active = true;

    void Promise.all([getContact(id), listInteractions(id), listNotes(id)]).then(
      ([contactResult, interactionsResult, notesResult]) => {
        if (!active) {
          return;
        }

        if (!contactResult.ok) {
          if (contactResult.status === 401) {
            void navigate("/login");
            return;
          }

          if (contactResult.status === 404) {
            void navigate("/app");
            return;
          }

          setLoadError(contactResult.message);
          return;
        }

        if (!interactionsResult.ok || !notesResult.ok) {
          setLoadError("That didn't load. Refresh and try again.");
          return;
        }

        setContact(contactResult.value);
        setInteractions(interactionsResult.value);
        setNotes(notesResult.value);
      },
    );

    return () => {
      active = false;
    };
  }, [session, id, navigate]);

  async function refreshInteractions() {
    if (id === undefined) {
      return;
    }

    const result = await listInteractions(id);

    if (result.ok) {
      setInteractions(result.value);
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

  if (isPending) {
    return <PageLoading />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  if (loadError !== null) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader email={session.user.email} />
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-12">
          <p className="text-body-md text-ink-secondary">{loadError}</p>
        </main>
      </div>
    );
  }

  if (contact === null || interactions === null || notes === null) {
    return <PageLoading label="Fetching this contact" />;
  }

  const lastOn = lastInteractionDate(interactions);
  const days = lastOn === null ? null : daysSince(new Date(`${lastOn}T00:00:00.000Z`), new Date());

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <LetterAvatar name={contact.name} />
            <div className="flex flex-col gap-0.5">
              <p className="text-micro-cap uppercase text-ink-mute">Contact</p>
              <h1 className="font-display text-display-lg text-ink">{contact.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {days !== null && (
              <span className="flex flex-col items-end">
                <span className="font-display text-numeral tabular-nums text-ink">{days}</span>
                <span className="text-caption text-ink-mute">days since you talked</span>
              </span>
            )}
            <Button asChild variant="secondary">
              <Link to={`/app/contacts/${contact.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_260px]">
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
              <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
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
                  const Glyph = typeGlyphs[interaction.type];

                  return (
                    <li className="relative pl-10" key={interaction.id}>
                      <span className="absolute left-0 top-0 flex size-7 items-center justify-center rounded-full bg-primary-bg-subdued text-primary">
                        <Glyph aria-hidden className="size-3.5" />
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
      </main>
    </div>
  );
}
