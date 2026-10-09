import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ocean-deep px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-micro-cap uppercase text-on-primary/60">Memoir</p>
          <h1 className="font-display text-display-lg text-on-primary">{title}</h1>
          <p className="text-body-md text-on-primary/70">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
