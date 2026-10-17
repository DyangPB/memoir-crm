import type { ReactNode } from "react";

import { Icon } from "./icon";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ocean-deep">
      <div aria-hidden className="airmail-edge h-1.5 w-full" />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-label-md uppercase tracking-wider text-on-primary/60">
              <Icon className="text-lg" name="history_edu" />
              Memoir
            </p>
            <h1 className="font-display text-display-lg text-on-primary">{title}</h1>
            <p className="text-body-md text-on-primary/70">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
