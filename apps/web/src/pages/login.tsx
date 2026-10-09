import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { AuthShell } from "../components/auth-shell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { authClient } from "../lib/auth-client";
import { useGoogleEnabled } from "../lib/use-google-enabled";

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const googleEnabled = useGoogleEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isPending && session !== null) {
    return <Navigate replace to="/app" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await authClient.signIn.email({ email, password });

    setSubmitting(false);

    if (result.error !== null) {
      setError(
        result.error.status === 401
          ? "That email and password don't match an account. Try again."
          : "That didn't sign you in. Try again.",
      );
      return;
    }

    void navigate("/app");
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
  }

  return (
    <AuthShell subtitle="Sign in to your memoir." title="Welcome back.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-caption text-on-primary/70" htmlFor="email">
            Email
          </label>
          <Input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-caption text-on-primary/70" htmlFor="password">
            Password
          </label>
          <Input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}
        <Button className="w-full" disabled={submitting} type="submit" variant="onDark">
          {submitting ? "Signing you in" : "Sign in"}
        </Button>
      </form>

      {googleEnabled && (
        <Button className="w-full" onClick={handleGoogle} variant="onDarkOutline">
          Continue with Google
        </Button>
      )}

      <p className="text-caption text-on-primary/70">
        New here?{" "}
        <Link className="text-on-primary underline" to="/signup">
          Create your account
        </Link>
      </p>
    </AuthShell>
  );
}
