import type { ReminderWithContact } from "@memoir/core";
import { useEffect, useState } from "react";
import { Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { PageLoading } from "../components/page-loading";
import { ReminderStrip } from "../components/reminder-strip";
import { listOpenReminders } from "../lib/api";
import { authClient } from "../lib/auth-client";

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();
  const [reminders, setReminders] = useState<ReminderWithContact[]>([]);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void listOpenReminders().then((result) => {
      if (active && result.ok) {
        setReminders(result.value);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  if (isPending) {
    return <PageLoading label="Fetching your dashboard" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        <ReminderStrip reminders={reminders} />
      </main>
    </div>
  );
}
