import { daysSince, type Contact, type LabelSummary } from "@memoir/core";
import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import { AppHeader } from "../components/app-header";
import { LetterAvatar } from "../components/letter-avatar";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { listContacts, listLabels } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";

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
        to={`/app/contacts/${contact.id}`}
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

function chipClass(active: boolean): string {
  return cn(
    "rounded-full px-3 py-1 text-micro-cap uppercase transition-colors",
    active
      ? "bg-primary text-on-primary"
      : "bg-primary-bg-subdued text-primary hover:bg-primary-bg-subdued/70",
  );
}

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const activeLabelId = searchParams.get("label");
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          if (searchInput.trim() === "") {
            next.delete("q");
          } else {
            next.set("q", searchInput.trim());
          }

          return next;
        },
        { replace: true },
      );
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, setSearchParams]);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void listLabels().then((result) => {
      if (active && result.ok) {
        setLabels(result.value);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void listContacts({ q: query, label: activeLabelId ?? undefined }).then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setContacts(result.value);
        setError(null);
      } else {
        setError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, [session, query, activeLabelId]);

  function selectLabel(labelId: string | null) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        if (labelId === null) {
          next.delete("label");
        } else {
          next.set("label", labelId);
        }

        return next;
      },
      { replace: true },
    );
  }

  function clearSearch() {
    setSearchInput("");
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("q");

        return next;
      },
      { replace: true },
    );
  }

  if (isPending) {
    return <PageLoading label="Fetching your people" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  const isFiltering = query.trim() !== "" || activeLabelId !== null;
  const showEmptyState = contacts !== null && contacts.length === 0 && !isFiltering;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        {contacts === null ? (
          <p className="text-caption text-ink-mute">Fetching your people</p>
        ) : showEmptyState ? (
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-display-md text-ink">Your people</h1>
                <Button asChild>
                  <Link to="/app/contacts/new">Add contact</Link>
                </Button>
              </div>

              <Input
                aria-label="Search your people"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search your people"
                type="search"
                value={searchInput}
              />

              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={chipClass(activeLabelId === null)}
                    onClick={() => selectLabel(null)}
                    type="button"
                  >
                    All
                  </button>
                  {labels.map((label) => (
                    <button
                      className={chipClass(activeLabelId === label.id)}
                      key={label.id}
                      onClick={() => selectLabel(label.id)}
                      type="button"
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {contacts.length === 0 ? (
              <div className="flex flex-col gap-2">
                {query.trim() !== "" ? (
                  <>
                    <p className="text-body-md text-ink-secondary">
                      Nothing matched "{query.trim()}". Try a name, a place, or something you talked
                      about.
                    </p>
                    <Button className="self-start" onClick={clearSearch} variant="ghost">
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-body-md text-ink-secondary">
                      No one carries this label yet.
                    </p>
                    <Button
                      className="self-start"
                      onClick={() => selectLabel(null)}
                      variant="ghost"
                    >
                      Show everyone
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {contacts.map((contact) => (
                  <ContactRow contact={contact} key={contact.id} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
