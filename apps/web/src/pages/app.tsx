import { daysSince, type Contact } from "@memoir/core";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { LetterAvatar } from "../components/letter-avatar";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { listContacts } from "../lib/api";
import { authClient } from "../lib/auth-client";

function ContactRow({ contact }: { contact: Contact }) {
  const caption = contact.emails[0] ?? contact.howWeMet ?? null;
  const days =
    contact.lastInteractionAt !== null
      ? daysSince(new Date(contact.lastInteractionAt), new Date())
      : null;

  return (
    <li>
      <Link
        className="flex items-center gap-3 rounded-sm px-2 py-3 transition-colors hover:bg-primary-bg-subdued"
        to={`/app/contacts/${contact.id}/edit`}
      >
        <LetterAvatar name={contact.name} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-contact-name text-ink">{contact.name}</span>
          {caption !== null && (
            <span className="truncate text-caption text-ink-mute">{caption}</span>
          )}
        </span>
        {days !== null && (
          <span className="flex flex-col items-end">
            <span className="font-display text-display-md tabular-nums text-ink">{days}</span>
            <span className="text-caption text-ink-mute">days since you talked</span>
          </span>
        )}
      </Link>
    </li>
  );
}

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void listContacts().then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setContacts(result.value);
      } else {
        setError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  if (isPending) {
    return <PageLoading label="Fetching your people" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        {contacts === null ? (
          <p className="text-caption text-ink-mute">Fetching your people</p>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-display-md text-ink">Your people, all in one place.</h1>
            <p className="text-body-md text-ink-secondary">
              Add your first contact, and Memoir will help you stay in touch.
            </p>
            <Button asChild className="self-start">
              <Link to="/app/contacts/new">Add your first contact</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-display-md text-ink">Your people</h1>
              <Button asChild>
                <Link to="/app/contacts/new">Add contact</Link>
              </Button>
            </div>
            <ul className="flex flex-col divide-y divide-hairline">
              {contacts.map((contact) => (
                <ContactRow contact={contact} key={contact.id} />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
