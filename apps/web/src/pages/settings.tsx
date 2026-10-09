import type { LabelSummary } from "@memoir/core";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { createLabel, deleteLabel, listLabels, updateLabel } from "../lib/api";
import { authClient } from "../lib/auth-client";

function sortLabels(items: LabelSummary[]): LabelSummary[] {
  return [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [labels, setLabels] = useState<LabelSummary[] | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingLabelId, setConfirmingLabelId] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void listLabels().then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setLabels(result.value);
      } else {
        setLabelError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-caption text-ink-mute">Fetching your memoir</p>
      </div>
    );
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await authClient.deleteUser(password === "" ? {} : { password });

    setSubmitting(false);

    if (result.error !== null) {
      setError("That password doesn't match. Nothing was deleted.");
      return;
    }

    void navigate("/login");
  }

  async function handleAddLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newLabelName.trim();

    if (name === "") {
      return;
    }

    setAddingLabel(true);
    const result = await createLabel(name);
    setAddingLabel(false);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setNewLabelName("");
    setLabels(sortLabels([...(labels ?? []), result.value]));
  }

  async function handleRenameLabel(labelId: string) {
    const name = renameValue.trim();

    if (name === "") {
      return;
    }

    const result = await updateLabel(labelId, name);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setEditingLabelId(null);
    setLabels(
      sortLabels((labels ?? []).map((label) => (label.id === labelId ? result.value : label))),
    );
  }

  async function handleDeleteLabel(labelId: string) {
    const result = await deleteLabel(labelId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setConfirmingLabelId(null);
    setLabels((labels ?? []).filter((label) => label.id !== labelId));
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <p className="text-micro-cap uppercase text-ink-mute">Settings</p>
          <h1 className="font-display text-display-md text-ink">Your account</h1>
        </div>

        <section className="flex flex-col gap-1 rounded-lg border border-hairline p-6">
          <h2 className="text-heading-md text-ink">Profile</h2>
          <p className="text-body-md text-ink-secondary">
            {session.user.name} · {session.user.email}
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-hairline p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-md text-ink">Labels</h2>
            <p className="text-caption text-ink-mute">
              Group your contacts and filter the home list by them.
            </p>
          </div>

          <form className="flex gap-2" onSubmit={handleAddLabel}>
            <Input
              aria-label="New label"
              onChange={(event) => setNewLabelName(event.target.value)}
              placeholder="New label"
              value={newLabelName}
            />
            <Button disabled={addingLabel} type="submit" variant="secondary">
              {addingLabel ? "Adding" : "Add label"}
            </Button>
          </form>

          {labelError !== null && (
            <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
              {labelError}
            </p>
          )}

          {labels === null ? (
            <p className="text-caption text-ink-mute">Fetching your labels</p>
          ) : labels.length === 0 ? (
            <p className="text-caption text-ink-mute">No labels yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {labels.map((label) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-2" key={label.id}>
                  {editingLabelId === label.id ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRenameLabel(label.id);
                      }}
                    >
                      <Input
                        aria-label={`Rename ${label.name}`}
                        onChange={(event) => setRenameValue(event.target.value)}
                        value={renameValue}
                      />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingLabelId(null);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : confirmingLabelId === label.id ? (
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                      <p className="text-body-md text-ink-secondary">
                        Delete the label "{label.name}"? It comes off {label.contactCount}{" "}
                        {label.contactCount === 1 ? "contact" : "contacts"}.
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => void handleDeleteLabel(label.id)} variant="danger">
                          Delete label
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingLabelId(null);
                          }}
                          variant="ghost"
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-body-md text-ink">{label.name}</span>
                        <span className="text-caption text-ink-mute">
                          {label.contactCount === 1
                            ? "1 contact"
                            : `${label.contactCount} contacts`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingLabelId(label.id);
                            setRenameValue(label.name);
                          }}
                          variant="ghost"
                        >
                          Rename
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingLabelId(label.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-danger/30 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-md text-danger">Delete your account</h2>
            <p className="text-body-md text-ink-secondary">
              Deleting your account removes everything: contacts, timeline, notes, reminders. This
              can't be undone.
            </p>
          </div>

          {!confirming ? (
            <Button
              className="self-start"
              onClick={() => {
                setConfirming(true);
              }}
              variant="secondary"
            >
              Delete my account
            </Button>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleDelete}>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption text-ink-mute" htmlFor="confirm-password">
                  Enter your password to confirm.
                </label>
                <Input
                  autoComplete="current-password"
                  id="confirm-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              {error !== null && (
                <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
              )}
              <div className="flex gap-3">
                <Button disabled={submitting} type="submit" variant="danger">
                  {submitting ? "Deleting your account" : "Delete my account"}
                </Button>
                <Button
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Keep my account
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
