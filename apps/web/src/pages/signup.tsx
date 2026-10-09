import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { AuthShell } from "../components/auth-shell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { authClient } from "../lib/auth-client";
import { useGoogleEnabled } from "../lib/use-google-enabled";

export function SignupPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const googleEnabled = useGoogleEnabled();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isPending && session !== null) {
    return <Navigate replace to="/app" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setSubmitting(true);

    const result = await authClient.signUp.email({ name, email, password });

    setSubmitting(false);

    if (result.error !== null) {
      setError(
        result.error.status === 422
          ? "That email already has a memoir. Sign in instead."
          : "That didn't create your account. Try again.",
      );
      return;
    }

    void navigate("/app");
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
  }

  return (
    <AuthShell
      subtitle="A personal CRM for the people who matter."
      title="Start your memoir."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-caption text-on-primary/70" htmlFor="name">
            Name
          </label>
          <Input
            autoComplete="name"
            id="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>
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
            autoComplete="new-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <p className="text-caption text-on-primary/60">At least 8 characters.</p>
        </div>
        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}
        <Button className="w-full" disabled={submitting} type="submit" variant="onDark">
          {submitting ? "Creating your account" : "Create account"}
        </Button>
      </form>

      {googleEnabled && (
        <Button className="w-full" onClick={handleGoogle} variant="onDarkOutline">
          Continue with Google
        </Button>
      )}

      <p className="text-caption text-on-primary/70">
        Already keep a memoir?{" "}
        <Link className="text-on-primary underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
