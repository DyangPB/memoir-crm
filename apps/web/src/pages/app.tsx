import { Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { authClient } from "../lib/auth-client";

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();

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

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex max-w-xl flex-col gap-3 px-6 py-16">
        <p className="text-micro-cap uppercase text-ink-mute">Memoir</p>
        <h1 className="font-display text-display-md text-ink">You're in.</h1>
        <p className="text-body-md text-ink-secondary">The contact list lands here next.</p>
      </main>
    </div>
  );
}
