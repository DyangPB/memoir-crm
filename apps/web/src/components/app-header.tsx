import { Link, useNavigate } from "react-router";

import { authClient } from "../lib/auth-client";
import { Button } from "./ui/button";

type AppHeaderProps = {
  email: string;
};

export function AppHeader({ email }: AppHeaderProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();

    void navigate("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
      <Link className="font-display text-heading-lg text-ink" to="/app">
        Memoir
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-caption text-ink-mute">{email}</span>
        <Link className="text-caption text-ink-mute hover:text-ink" to="/app/settings">
          Settings
        </Link>
        <Button onClick={handleSignOut} variant="ghost">
          Sign out
        </Button>
      </div>
    </header>
  );
}
