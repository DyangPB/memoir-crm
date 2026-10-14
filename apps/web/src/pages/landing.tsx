import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import contactDetails from "../assets/contact-details.png";
import contactLabels from "../assets/contact-labels.png";
import contactThread from "../assets/contact-thread.png";
import contactThreadMobile from "../assets/contact-thread-mobile.png";
import contactsList from "../assets/contacts-list.png";
import remindersDue from "../assets/reminders-due.png";
import remindersDueMobile from "../assets/reminders-due-mobile.png";
import { AirmailEdge } from "../components/airmail-edge";
import { ContactSheet, PaperStack } from "../components/contact-sheet";
import { Button } from "../components/ui/button";
import { startDemo } from "../lib/api";
import { cn } from "../lib/utils";

type FeatureProps = {
  id: string;
  title: string;
  body: string;
  reverse?: boolean;
  children: ReactNode;
};

function Feature({ body, children, id, reverse = false, title }: FeatureProps) {
  return (
    <section
      className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:py-24 lg:grid-cols-2"
      id={id}
    >
      <div className={cn("flex flex-col gap-4", reverse && "lg:order-2")}>
        <h2 className="font-display text-display-lg text-ink">{title}</h2>
        <p className="text-body-lg text-ink-secondary">{body}</p>
      </div>
      <div className={cn("flex justify-center", reverse && "lg:order-1")}>{children}</div>
    </section>
  );
}

export function LandingPage() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTryDemo() {
    setStarting(true);
    setError(null);

    const result = await startDemo();

    if (!result.ok) {
      setError(result.message);
      setStarting(false);

      return;
    }

    // A full load, so the new session is picked up by every surface.
    window.location.assign("/app");
  }

  const demoLabel = starting ? "Setting up the demo" : "Try the demo";

  return (
    <div className="min-h-screen bg-canvas">
      <AirmailEdge />
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas">
        <nav className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-4 px-6 py-4 md:grid-cols-3">
          <Link className="font-display text-heading-lg text-ink" to="/">
            Memoir
          </Link>
          <div className="hidden items-center justify-center gap-6 md:flex">
            <a className="text-body-md text-ink-secondary hover:text-ink" href="#thread">
              The thread
            </a>
            <a className="text-body-md text-ink-secondary hover:text-ink" href="#details">
              The details
            </a>
            <a className="text-body-md text-ink-secondary hover:text-ink" href="#reminders">
              The reminders
            </a>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Link className="text-body-md text-ink-secondary hover:text-ink" to="/login">
              Sign in
            </Link>
            <Button disabled={starting} onClick={() => void handleTryDemo()}>
              {demoLabel}
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-display-lg text-ink md:text-display-xl lg:text-display-xxl">
              A memoir of everyone you know.
            </h1>
            <p className="text-body-lg text-ink-mute">A personal CRM for the people who matter.</p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={starting} onClick={() => void handleTryDemo()} size="lg">
                {demoLabel}
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/signup">Create your account</Link>
              </Button>
            </div>
            {error !== null && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
            )}
          </div>

          <div className="lg:hidden">
            <ContactSheet
              alt="A timeline thread of calls, messages, a meeting, and a note"
              className="mx-auto w-full max-w-[342px]"
              height={496}
              loading="lazy"
              src={contactThreadMobile}
              width={390}
            />
          </div>
          <div className="hidden lg:block">
            <div className="mx-auto flex w-full max-w-[576px] flex-col gap-6">
              <PaperStack className="w-full">
                <ContactSheet
                  alt="The contact list in Memoir, with the days since you talked"
                  height={577}
                  loading="lazy"
                  src={contactsList}
                  width={576}
                />
              </PaperStack>
              <ContactSheet
                alt="A timeline thread: calls, messages, a meeting, and a note"
                className="w-full max-w-[409px] self-end"
                height={496}
                loading="lazy"
                src={contactThread}
                width={409}
              />
            </div>
          </div>
        </section>

        <div className="bg-canvas-soft">
          <Feature
            body="Log a call, a coffee, a message. Every contact keeps a timeline, so you can see how a friendship is going and what you said last."
            id="thread"
            title="The thread"
          >
            <div className="w-full md:hidden">
              <ContactSheet
                alt="A timeline thread of calls, messages, a meeting, and a note"
                className="mx-auto w-full max-w-[342px]"
                height={496}
                loading="lazy"
                src={contactThreadMobile}
                width={390}
              />
            </div>
            <ContactSheet
              alt="A timeline thread of calls, messages, a meeting, and a note"
              className="hidden w-full max-w-[409px] md:block"
              height={496}
              loading="lazy"
              src={contactThread}
              width={409}
            />
          </Feature>
        </div>

        <Feature
          body="Birthdays, the names of their kids, the book they lent you. Notes, labels, and custom fields keep the details that make a friendship work."
          id="details"
          reverse
          title="The details"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-4">
            <ContactSheet
              alt="A contact's details, including birthday, how you met, and custom fields"
              height={840}
              loading="lazy"
              src={contactDetails}
              width={308}
            />
            <ContactSheet
              alt="Labels applied to a contact"
              className="sm:mt-16 sm:-rotate-[0.6deg]"
              height={297}
              loading="lazy"
              src={contactLabels}
              width={308}
            />
          </div>
        </Feature>

        <div className="bg-canvas-soft">
          <Feature
            body="Reminders for the reach-outs you owe, and important dates that come back every year. Memoir tells you who to write to this week."
            id="reminders"
            title="The reminders"
          >
            <div className="w-full md:hidden">
              <ContactSheet
                alt="Overdue and due reminders, each naming the contact"
                className="mx-auto w-full max-w-[342px]"
                height={447}
                loading="lazy"
                src={remindersDueMobile}
                width={390}
              />
            </div>
            <ContactSheet
              alt="Overdue and due reminders, each naming the contact"
              className="hidden w-full max-w-[576px] md:block"
              height={400}
              loading="lazy"
              src={remindersDue}
              width={768}
            />
          </Feature>
        </div>

        <section className="bg-vellum">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-16 md:py-24">
            <h2 className="font-display text-display-lg text-ink">Your memoir, nobody else's.</h2>
            <p className="max-w-2xl text-body-lg text-ink-secondary">
              Nothing is shared, and nobody else can see your people. The demo opens a real
              memoir, already filled in, and it is yours to click around.
            </p>
          </div>
        </section>
      </main>

      <footer className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-display text-heading-lg text-ink">Memoir</p>
            <p className="text-caption text-ink-mute">A personal CRM for the people who matter.</p>
          </div>
          <div className="flex gap-16">
            <div className="flex flex-col gap-2">
              <p className="text-micro-cap uppercase text-ink-mute">The product</p>
              <a className="text-caption text-ink-secondary hover:text-ink" href="#thread">
                The thread
              </a>
              <a className="text-caption text-ink-secondary hover:text-ink" href="#details">
                The details
              </a>
              <a className="text-caption text-ink-secondary hover:text-ink" href="#reminders">
                The reminders
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-micro-cap uppercase text-ink-mute">Your memoir</p>
              <Link className="text-caption text-ink-secondary hover:text-ink" to="/login">
                Sign in
              </Link>
              <Link className="text-caption text-ink-secondary hover:text-ink" to="/signup">
                Create your account
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 w-full max-w-6xl border-t border-hairline pt-6">
          <p className="text-caption text-ink-mute">
            Private by default. No sharing, no teams, no pipeline.
          </p>
        </div>
      </footer>
    </div>
  );
}

