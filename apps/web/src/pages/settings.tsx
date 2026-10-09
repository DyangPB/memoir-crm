import {
  fieldTypeLabel,
  fieldTypes,
  type FieldDefinitionSummary,
  type FieldType,
  type LabelSummary,
} from "@memoir/core";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  createFieldDefinition,
  createLabel,
  deleteFieldDefinition,
  deleteLabel,
  listFieldDefinitions,
  listLabels,
  updateFieldDefinition,
  updateLabel,
} from "../lib/api";
import { authClient } from "../lib/auth-client";

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

function optionList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((option) => option.trim())
        .filter((option) => option !== ""),
    ),
  ];
}

function fieldSummaryLine(field: FieldDefinitionSummary): string {
  const type = fieldTypeLabel(field.type);

  return field.options.length === 0 ? type : `${type} · ${field.options.join(", ")}`;
}

function contactCountLabel(count: number): string {
  return count === 1 ? "1 contact" : `${count} contacts`;
}

export function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [labels, setLabels] = useState<LabelSummary[] | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingLabelId, setConfirmingLabelId] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldDefinitionSummary[] | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [addingField, setAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [renameFieldValue, setRenameFieldValue] = useState("");
  const [confirmingFieldId, setConfirmingFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void Promise.all([listLabels(), listFieldDefinitions()]).then(([labelsResult, fieldsResult]) => {
      if (!active) {
        return;
      }

      if (labelsResult.ok) {
        setLabels(labelsResult.value);
      } else {
        setLabelError(labelsResult.message);
      }

      if (fieldsResult.ok) {
        setFields(fieldsResult.value);
      } else {
        setFieldError(fieldsResult.message);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-caption text-ink-mute">Fetching your memoir</p>
      </div>
    );
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await authClient.deleteUser(password === "" ? {} : { password });

    setSubmitting(false);

    if (result.error !== null) {
      setError("That password doesn't match. Nothing was deleted.");
      return;
    }

    void navigate("/login");
  }

  async function handleAddLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newLabelName.trim();

    if (name === "") {
      return;
    }

    setAddingLabel(true);
    const result = await createLabel(name);
    setAddingLabel(false);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setNewLabelName("");
    setLabels(sortByName([...(labels ?? []), result.value]));
  }

  async function handleRenameLabel(labelId: string) {
    const name = renameValue.trim();

    if (name === "") {
      return;
    }

    const result = await updateLabel(labelId, name);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setEditingLabelId(null);
    setLabels(
      sortByName((labels ?? []).map((label) => (label.id === labelId ? result.value : label))),
    );
  }

  async function handleDeleteLabel(labelId: string) {
    const result = await deleteLabel(labelId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setLabelError(result.message);
      return;
    }

    setLabelError(null);
    setConfirmingLabelId(null);
    setLabels((labels ?? []).filter((label) => label.id !== labelId));
  }

  async function handleAddField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFieldName.trim();

    if (name === "") {
      return;
    }

    const selects = newFieldType === "single-select" || newFieldType === "multi-select";

    setAddingField(true);
    const result = await createFieldDefinition({
      name,
      type: newFieldType,
      options: selects ? optionList(newFieldOptions) : [],
    });
    setAddingField(false);

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setFieldError(result.message);
      return;
    }

    setFieldError(null);
    setNewFieldName("");
    setNewFieldOptions("");
    setFields(sortByName([...(fields ?? []), result.value]));
  }

  async function handleRenameField(field: FieldDefinitionSummary) {
    const name = renameFieldValue.trim();

    if (name === "") {
      return;
    }

    const result = await updateFieldDefinition(field.id, {
      name,
      type: field.type,
      options: field.options,
    });

    if (!result.ok) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setFieldError(result.message);
      return;
    }

    setFieldError(null);
    setEditingFieldId(null);
    setFields(sortByName((fields ?? []).map((item) => (item.id === field.id ? result.value : item))));
  }

  async function handleDeleteField(fieldId: string) {
    const result = await deleteFieldDefinition(fieldId);

    if (!result.ok && result.status !== 404) {
      if (result.status === 401) {
        void navigate("/login");
        return;
      }

      setFieldError(result.message);
      return;
    }

    setFieldError(null);
    setConfirmingFieldId(null);
    setFields((fields ?? []).filter((field) => field.id !== fieldId));
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <p className="text-micro-cap uppercase text-ink-mute">Settings</p>
          <h1 className="font-display text-display-md text-ink">Your account</h1>
        </div>

        <section className="flex flex-col gap-1 rounded-lg border border-hairline p-6">
          <h2 className="text-heading-md text-ink">Profile</h2>
          <p className="text-body-md text-ink-secondary">
            {session.user.name} · {session.user.email}
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-hairline p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-md text-ink">Custom fields</h2>
            <p className="text-caption text-ink-mute">
              Track the details that matter to you. Every contact can carry a value for each field.
            </p>
          </div>

          <form className="flex flex-col gap-3" onSubmit={handleAddField}>
            <div className="flex flex-col gap-1.5">
              <label className="text-caption text-ink-mute" htmlFor="new-field-name">
                Name
              </label>
              <Input
                id="new-field-name"
                onChange={(event) => setNewFieldName(event.target.value)}
                placeholder="Gift ideas"
                value={newFieldName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-caption text-ink-mute" htmlFor="new-field-type">
                Type
              </label>
              <Select
                className="w-56"
                id="new-field-type"
                onChange={(event) => setNewFieldType(event.target.value as FieldType)}
                value={newFieldType}
              >
                {fieldTypes.map((type) => (
                  <option key={type} value={type}>
                    {fieldTypeLabel(type)}
                  </option>
                ))}
              </Select>
            </div>
            {(newFieldType === "single-select" || newFieldType === "multi-select") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-caption text-ink-mute" htmlFor="new-field-options">
                  Options
                </label>
                <Input
                  id="new-field-options"
                  onChange={(event) => setNewFieldOptions(event.target.value)}
                  placeholder="Home, Work, College"
                  value={newFieldOptions}
                />
                <p className="text-caption text-ink-mute">Separate options with commas.</p>
              </div>
            )}
            <Button className="self-start" disabled={addingField} type="submit" variant="secondary">
              {addingField ? "Adding" : "Add field"}
            </Button>
          </form>

          {fieldError !== null && (
            <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
              {fieldError}
            </p>
          )}

          {fields === null ? (
            <p className="text-caption text-ink-mute">Fetching your fields</p>
          ) : fields.length === 0 ? (
            <p className="text-caption text-ink-mute">
              No custom fields yet. Add one above, and it appears on every contact.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {fields.map((field) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-2" key={field.id}>
                  {editingFieldId === field.id ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRenameField(field);
                      }}
                    >
                      <Input
                        aria-label={`Rename ${field.name}`}
                        onChange={(event) => setRenameFieldValue(event.target.value)}
                        value={renameFieldValue}
                      />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingFieldId(null);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : confirmingFieldId === field.id ? (
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                      <p className="text-body-md text-ink-secondary">
                        Delete the field "{field.name}"? Its values come off{" "}
                        {contactCountLabel(field.contactCount)}. This can't be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => void handleDeleteField(field.id)} variant="danger">
                          Delete field
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingFieldId(null);
                          }}
                          variant="ghost"
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-body-md text-ink">{field.name}</span>
                          <span className="text-caption text-ink-mute">
                            {contactCountLabel(field.contactCount)}
                          </span>
                        </div>
                        <span className="text-caption text-ink-mute">{fieldSummaryLine(field)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingFieldId(field.id);
                            setRenameFieldValue(field.name);
                          }}
                          variant="ghost"
                        >
                          Rename
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingFieldId(field.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-hairline p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-md text-ink">Labels</h2>
            <p className="text-caption text-ink-mute">
              Group your contacts and filter the home list by them.
            </p>
          </div>

          <form className="flex gap-2" onSubmit={handleAddLabel}>
            <Input
              aria-label="New label"
              onChange={(event) => setNewLabelName(event.target.value)}
              placeholder="New label"
              value={newLabelName}
            />
            <Button disabled={addingLabel} type="submit" variant="secondary">
              {addingLabel ? "Adding" : "Add label"}
            </Button>
          </form>

          {labelError !== null && (
            <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
              {labelError}
            </p>
          )}

          {labels === null ? (
            <p className="text-caption text-ink-mute">Fetching your labels</p>
          ) : labels.length === 0 ? (
            <p className="text-caption text-ink-mute">No labels yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {labels.map((label) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-2" key={label.id}>
                  {editingLabelId === label.id ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRenameLabel(label.id);
                      }}
                    >
                      <Input
                        aria-label={`Rename ${label.name}`}
                        onChange={(event) => setRenameValue(event.target.value)}
                        value={renameValue}
                      />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingLabelId(null);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : confirmingLabelId === label.id ? (
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                      <p className="text-body-md text-ink-secondary">
                        Delete the label "{label.name}"? It comes off {label.contactCount}{" "}
                        {label.contactCount === 1 ? "contact" : "contacts"}.
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => void handleDeleteLabel(label.id)} variant="danger">
                          Delete label
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingLabelId(null);
                          }}
                          variant="ghost"
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-body-md text-ink">{label.name}</span>
                        <span className="text-caption text-ink-mute">
                          {contactCountLabel(label.contactCount)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingLabelId(label.id);
                            setRenameValue(label.name);
                          }}
                          variant="ghost"
                        >
                          Rename
                        </Button>
                        <Button
                          onClick={() => {
                            setConfirmingLabelId(label.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-danger/30 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-md text-danger">Delete your account</h2>
            <p className="text-body-md text-ink-secondary">
              Deleting your account removes everything: contacts, timeline, notes, reminders. This
              can't be undone.
            </p>
          </div>

          {!confirming ? (
            <Button
              className="self-start"
              onClick={() => {
                setConfirming(true);
              }}
              variant="secondary"
            >
              Delete my account
            </Button>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleDelete}>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption text-ink-mute" htmlFor="confirm-password">
                  Enter your password to confirm.
                </label>
                <Input
                  autoComplete="current-password"
                  id="confirm-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              {error !== null && (
                <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
              )}
              <div className="flex gap-3">
                <Button disabled={submitting} type="submit" variant="danger">
                  {submitting ? "Deleting your account" : "Delete my account"}
                </Button>
                <Button
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Keep my account
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
