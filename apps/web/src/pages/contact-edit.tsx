import type { Contact, ContactInput } from "@memoir/core";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { AppHeader } from "../components/app-header";
import { ContactForm } from "../components/contact-form";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { deleteContact, getContact, updateContact } from "../lib/api";
import { authClient } from "../lib/auth-client";

export function ContactEditPage() {
  const { id } = useParams();
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (session === null || id === undefined) {
      return;
    }

    let active = true;

    void getContact(id).then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setContact(result.value);
        return;
      }

      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      if (result.status === 404) {
        void navigate("/app");
        return;
      }

      setLoadError(result.message);
    });

    return () => {
      active = false;
    };
  }, [session, id, navigate]);

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
        <main className="mx-auto flex w-full max-w-xl flex-col gap-3 px-6 py-12">
          <p className="text-body-md text-ink-secondary">{loadError}</p>
        </main>
      </div>
    );
  }

  if (contact === null) {
    return <PageLoading label="Fetching this contact" />;
  }

  const firstName = contact.name.split(" ")[0] ?? contact.name;

  async function handleSubmit(values: ContactInput) {
    if (contact === null) {
      return;
    }

    const result = await updateContact(contact.id, values);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setFormError(result.message);
      return;
    }

    void navigate("/app");
  }

  async function handleRemove() {
    if (contact === null) {
      return;
    }

    setRemoving(true);
    const result = await deleteContact(contact.id);
    setRemoving(false);

    if (!result.ok && result.status !== 404) {
      setFormError(result.message);
      return;
    }

    void navigate("/app");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-1">
          <p className="text-micro-cap uppercase text-ink-mute">Contact</p>
          <h1 className="font-display text-display-md text-ink">Edit {firstName}</h1>
        </div>

        <ContactForm
          cancelHref="/app"
          error={formError}
          initialValues={{
            name: contact.name,
            emails: contact.emails,
            phones: contact.phones,
            socialLinks: contact.socialLinks,
            birthday: contact.birthday,
            howWeMet: contact.howWeMet,
          }}
          onSubmit={handleSubmit}
          pendingLabel="Saving changes"
          submitLabel="Save changes"
        />

        <section className="flex flex-col gap-4 rounded-lg border border-danger/30 p-6">
          {!confirmingRemoval ? (
            <>
              <h2 className="text-heading-md text-ink">Remove {firstName}</h2>
              <Button
                className="self-start"
                onClick={() => {
                  setConfirmingRemoval(true);
                }}
                variant="secondary"
              >
                Remove {firstName}
              </Button>
            </>
          ) : (
            <>
              <p className="text-body-md text-ink-secondary">
                Remove {firstName} from Memoir? You'll lose their timeline and notes. This can't be
                undone.
              </p>
              <div className="flex gap-3">
                <Button disabled={removing} onClick={handleRemove} variant="danger">
                  {removing ? `Removing ${firstName}` : `Remove ${firstName}`}
                </Button>
                <Button
                  onClick={() => {
                    setConfirmingRemoval(false);
                  }}
                  variant="ghost"
                >
                  Keep {firstName}
                </Button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
