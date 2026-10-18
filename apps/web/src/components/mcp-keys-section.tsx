import type { McpKeySummary } from "@memoir/core";
import { useEffect, useState, type FormEvent } from "react";

import { createMcpKey, listMcpKeys, revokeMcpKey } from "../lib/api";
import { formatDay } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type NewKey = { name: string; secret: string };

export function McpKeysSection() {
  const [keys, setKeys] = useState<McpKeySummary[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listMcpKeys().then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setKeys(result.value);
      } else {
        setError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    const result = await createMcpKey(name);

    setCreating(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    setName("");
    setCopied(false);
    setNewKey({ name: result.value.key.name, secret: result.value.secret });
    setKeys((current) => [result.value.key, ...(current ?? [])]);
  }

  async function handleCopy(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setError("Couldn't copy that. Select the key and copy it by hand.");
    }
  }

  async function handleRevoke(keyId: string) {
    const result = await revokeMcpKey(keyId);

    if (!result.ok && result.status !== 404) {
      setError(result.message);
      return;
    }

    setError(null);
    setConfirmingId(null);
    setKeys((current) => (current ?? []).filter((key) => key.id !== keyId));
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-4 shadow-card sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-headline-sm text-ink">Assistant access</h2>
        <p className="text-caption text-ink-mute">
          Let an AI assistant read your contacts and log interactions, notes and reminders for you.
          Add <code className="text-ink-secondary">{`${window.location.origin}/mcp`}</code> to your
          assistant as an MCP server, with a key below as its Bearer token. Anything it deletes asks
          you first.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" onSubmit={handleCreate}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label className="text-caption text-ink-mute" htmlFor="mcp-key-name">
            Key name
          </label>
          <Input
            id="mcp-key-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Claude Desktop"
            required
            value={name}
          />
        </div>
        <Button disabled={creating} type="submit" variant="secondary">
          {creating ? "Creating the key" : "Create key"}
        </Button>
      </form>

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
          {error}
        </p>
      )}

      {newKey !== null && (
        <div className="flex flex-col gap-3 rounded-lg bg-vellum p-4">
          <p className="text-body-md text-ink">
            Here is the key for <strong>{newKey.name}</strong>. Copy it now: this is the only time
            Memoir shows it.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="New key"
              className="min-w-0 flex-1 font-mono"
              onFocus={(event) => event.target.select()}
              readOnly
              value={newKey.secret}
            />
            <Button onClick={() => void handleCopy(newKey.secret)} type="button" variant="secondary">
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => setNewKey(null)} type="button" variant="ghost">
              Done
            </Button>
          </div>
        </div>
      )}

      {keys === null ? (
        <p className="text-caption text-ink-mute">Fetching your keys</p>
      ) : keys.length === 0 ? (
        <p className="text-body-md text-ink-mute">No keys yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {keys.map((key) => (
            <li className="flex flex-col gap-1.5 py-3" key={key.id}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-body-md text-ink">{key.name}</span>
                <span className="font-mono text-caption text-ink-mute">{key.prefix}…</span>
                <span className="text-caption tabular-nums text-ink-mute">
                  Created {formatDay(key.createdAt.slice(0, 10))}
                </span>
              </div>
              {confirmingId === key.id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-caption text-ink-mute">
                    Revoke "{key.name}"? Any assistant using it stops working right away.
                  </span>
                  <Button onClick={() => void handleRevoke(key.id)} variant="danger">
                    Revoke key
                  </Button>
                  <Button onClick={() => setConfirmingId(null)} variant="ghost">
                    Keep it
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-2">
                  <Button onClick={() => setConfirmingId(key.id)} variant="ghost">
                    Revoke
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
