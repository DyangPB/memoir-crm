import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { authClient } from "../lib/auth-client";

export function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
