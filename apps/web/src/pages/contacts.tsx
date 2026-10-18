import { daysSince, type CadenceHealth, type Contact, type LabelSummary } from "@memoir/core";
import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useParams, useSearchParams } from "react-router";

import { AppHeader } from "../components/app-header";
import { CadenceHealthPill } from "../components/cadence-health-pill";
import { DaysSince } from "../components/days-since";
import { ContactAvatar } from "../components/contact-avatar";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { getCadence, listContacts, listLabels } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { todayForDayCounts, todayIsoDay } from "../lib/format";
import { cn } from "../lib/utils";

/** What the detail pane can ask of the list rail beside it. */
export type ContactsOutletContext = {
  refreshList: () => void;
};

function ContactRow({ contact, search }: { contact: Contact; search: string }) {
  const caption = contact.emails[0] ?? contact.howWeMet ?? null;
  const days =
    contact.lastInteractionAt !== null
      ? daysSince(new Date(contact.lastInteractionAt), todayForDayCounts())
      : null;

  return (
    <li>
      <NavLink
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-sm px-2 py-3 transition-colors hover:bg-primary-bg-subdued",
            isActive && "bg-primary-bg-subdued",
          )
        }
        to={{ pathname: `/app/contacts/${contact.id}`, search }}
      >
        <ContactAvatar contact={contact} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-contact-name text-ink">{contact.name}</span>
          {caption !== null && (
            <span className="truncate text-caption text-ink-mute">{caption}</span>
          )}
        </span>
        {days !== null && (
          <DaysSince
            className="max-w-[5.5rem] shrink-0 flex-col items-end gap-0 text-right"
            days={days}
            numeralClassName="text-display-md"
            targetDays={contact.effectiveCadenceDays}
          />
        )}
      </NavLink>
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

export function ContactsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: selectedId } = useParams();
  const { search } = useLocation();
  const query = searchParams.get("q") ?? "";
  const activeLabelId = searchParams.get("label");
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [health, setHealth] = useState<CadenceHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query);
  const [listVersion, setListVersion] = useState(0);

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
  }, [session, listVersion]);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    // Cadence Health is a nicety: if it can't load, the pill stays hidden.
    void getCadence(todayIsoDay()).then((result) => {
      if (active && result.ok) {
        setHealth(result.value.health);
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
  }, [session, query, activeLabelId, listVersion]);

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

  const hasSelection = selectedId !== undefined;
  const outletContext: ContactsOutletContext = {
    refreshList: () => setListVersion((version) => version + 1),
  };

  return (
    <div className="min-h-screen bg-canvas md:flex md:h-dvh md:flex-col md:overflow-hidden">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-8 md:min-h-0 md:flex-1 md:pb-0">
        {error !== null && (
          <p className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
            {error}
          </p>
        )}

        {showEmptyState ? (
          <div className="flex max-w-xl flex-col gap-3">
            <h1 className="font-display text-display-md text-ink">Your people, all in one place.</h1>
            <p className="text-body-md text-ink-secondary">
              Add your first contact, and Memoir will help you stay in touch.
            </p>
            <Button asChild className="self-start">
              <Link to="/app/contacts/new">Add your first contact</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:min-h-0 md:flex-1 md:grid-cols-[22rem_1fr] md:grid-rows-[minmax(0,1fr)]">
            <section
              aria-label="Your people"
              className={cn(
                "min-w-0 flex-col gap-6 md:min-h-0 md:overflow-y-auto md:pr-2 md:pb-8",
                hasSelection ? "hidden md:flex" : "flex",
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h1 className="font-display text-display-md text-ink">Your people</h1>
                  <Button asChild>
                    <Link to="/app/contacts/new">Add contact</Link>
                  </Button>
                </div>

                <CadenceHealthPill health={health} />

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

              {contacts === null ? (
                <p className="text-caption text-ink-mute">Fetching your people</p>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col gap-2">
                  {query.trim() !== "" ? (
                    <>
                      <p className="text-body-md text-ink-secondary">
                        Nothing matched "{query.trim()}". Try a name, a place, or something you
                        talked about.
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
                    <ContactRow contact={contact} key={contact.id} search={search} />
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-label="Contact detail"
              className={cn("min-w-0 md:min-h-0", hasSelection ? "block" : "hidden md:block")}
            >
              {hasSelection ? (
                <Outlet context={outletContext} key={selectedId} />
              ) : (
                <p className="text-body-md text-ink-mute">
                  Pick someone from the list to see your history together.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
