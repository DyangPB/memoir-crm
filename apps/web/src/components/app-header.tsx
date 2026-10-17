import { Link, NavLink, useNavigate } from "react-router";

import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

type AppHeaderProps = {
  email: string;
};

const navItems = [
  { label: "Dashboard", to: "/app", end: true },
  { label: "Contacts", to: "/app/contacts", end: false },
  { label: "Reminders", to: "/app/reminders", end: false },
  { label: "Settings", to: "/app/settings", end: false },
] as const;

export function AppHeader({ email }: AppHeaderProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();

    void navigate("/login");
  }

  return (
    <header className="bg-canvas">
      <div aria-hidden className="airmail-edge h-1.5 w-full" />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link className="font-display text-headline-md tracking-tight text-ink" to="/app">
            Memoir
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-label-lg transition-colors",
                    isActive
                      ? "bg-ocean-subdued text-primary-container"
                      : "text-on-surface-variant hover:bg-canvas-soft hover:text-on-surface",
                  )
                }
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-caption text-ink-mute sm:inline">{email}</span>
          <Button onClick={handleSignOut} variant="ghost">
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
