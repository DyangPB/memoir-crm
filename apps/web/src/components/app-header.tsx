import { Link, NavLink, useNavigate } from "react-router";

import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";
import { Icon } from "./icon";
import { Button } from "./ui/button";

type AppHeaderProps = {
  email: string;
};

const navItems = [
  { label: "Dashboard", icon: "dashboard", to: "/app", end: true },
  { label: "Contacts", icon: "group", to: "/app/contacts", end: false },
  { label: "Reminders", icon: "notifications", to: "/app/reminders", end: false },
  { label: "Calendar", icon: "calendar_month", to: "/app/calendar", end: false },
  { label: "Settings", icon: "settings", to: "/app/settings", end: false },
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
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-hairline px-4 py-2 sm:px-6 sm:py-3 lg:flex-nowrap">
        <div className="contents lg:flex lg:items-center lg:gap-x-6">
          <Link className="font-display text-headline-md tracking-tight text-ink" to="/app">
            Memoir
          </Link>
          <nav
            aria-label="Main"
            className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-0 sm:gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:p-0"
          >
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  // The size sits outside cn: tailwind-merge reads `text-label-*` as a colour and drops it.
                  `text-label-sm sm:text-label-lg ${cn(
                    "flex min-w-fit flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1.5 transition-colors sm:flex-none sm:flex-row sm:px-3 sm:py-2 lg:py-1.5",
                    isActive
                      ? "bg-ocean-subdued text-primary-container"
                      : "text-on-surface-variant hover:bg-canvas-soft hover:text-on-surface",
                  )}`
                }
                end={item.end}
                key={item.to}
                to={item.to}
              >
                <span className="flex sm:hidden">
                  <Icon className="text-xl" name={item.icon} />
                </span>
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
