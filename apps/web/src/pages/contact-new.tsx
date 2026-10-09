import type { ContactInput } from "@memoir/core";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { ContactForm, emptyContactInput } from "../components/contact-form";
import { PageLoading } from "../components/page-loading";
import { createContact } from "../lib/api";
import { authClient } from "../lib/auth-client";

export function ContactNewPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return <PageLoading />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  async function handleSubmit(values: ContactInput) {
    const result = await createContact(values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setError(result.message);
      return;
    }

    void navigate("/app");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-1">
          <p className="text-micro-cap uppercase text-ink-mute">New contact</p>
          <h1 className="font-display text-display-md text-ink">Add a contact</h1>
        </div>
        <ContactForm
          cancelHref="/app"
          error={error}
          initialValues={emptyContactInput}
          onSubmit={handleSubmit}
          pendingLabel="Adding your contact"
          submitLabel="Add contact"
        />
      </main>
    </div>
  );
}
