import type {
  ContactWriteInput,
  CustomFieldValues,
  FieldDefinition,
  SocialLink,
} from "@memoir/core";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

export const emptyContactInput: ContactWriteInput = {
  name: "",
  emails: [],
  phones: [],
  socialLinks: [],
  birthday: null,
  howWeMet: null,
  customFields: {},
};

type ContactFormProps = {
  initialValues: ContactWriteInput;
  definitions: FieldDefinition[];
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  error: string | null;
  onSubmit: (values: ContactWriteInput) => Promise<void>;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }

  return stringValue(value);
}

function multiSelectValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type CustomFieldControlProps = {
  definition: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
};

function CustomFieldControl({ definition, value, onChange }: CustomFieldControlProps) {
  const id = `custom-field-${definition.id}`;

  switch (definition.type) {
    case "text":
      return (
        <Input
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={stringValue(value)}
        />
      );
    case "number":
      return (
        <Input
          className="w-48"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          step="any"
          type="number"
          value={numberValue(value)}
        />
      );
    case "date":
      return (
        <Input
          className="w-48"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={stringValue(value)}
        />
      );
    case "long-text":
      return (
        <Textarea
          id={id}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          value={stringValue(value)}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-body-md text-ink-secondary">
          <input
            checked={value === true}
            className="accent-primary"
            id={id}
            onChange={(event) => onChange(event.target.checked)}
            type="checkbox"
          />
          Yes
        </label>
      );
    case "url":
      return (
        <Input
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com"
          type="url"
          value={stringValue(value)}
        />
      );
    case "single-select":
      return (
        <Select id={id} onChange={(event) => onChange(event.target.value)} value={stringValue(value)}>
          <option value="">Not set</option>
          {definition.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    case "multi-select": {
      const picked = multiSelectValue(value);

      return (
        <div className="flex flex-col gap-1.5">
          {definition.options.map((option) => (
            <label
              className="flex items-center gap-2 text-body-md text-ink-secondary"
              key={option}
            >
              <input
                checked={picked.includes(option)}
                className="accent-primary"
                onChange={(event) => {
                  onChange(
                    event.target.checked
                      ? [...picked, option]
                      : picked.filter((item) => item !== option),
                  );
                }}
                type="checkbox"
              />
              {option}
            </label>
          ))}
        </div>
      );
    }
  }
}

function valuesForSubmit(
  definitions: FieldDefinition[],
  customFields: CustomFieldValues,
): CustomFieldValues {
  const values: CustomFieldValues = {};

  for (const definition of definitions) {
    const value = customFields[definition.id];

    if (value === undefined) {
      continue;
    }

    if (definition.type === "number" && typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed === "") {
        continue;
      }

      const parsed = Number(trimmed);
      values[definition.id] = Number.isNaN(parsed) ? trimmed : parsed;
      continue;
    }

    values[definition.id] = value;
  }

  return values;
}

type StringListFieldProps = {
  legend: string;
  addLabel: string;
  type: "email" | "tel";
  values: string[];
  onChange: (values: string[]) => void;
};

function StringListField({ legend, addLabel, type, values, onChange }: StringListFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-caption text-ink-mute">{legend}</legend>
      {values.map((value, index) => (
        <div className="flex items-center gap-2" key={index}>
          <Input
            aria-label={`${legend} ${index + 1}`}
            onChange={(event) => {
              onChange(
                values.map((item, itemIndex) =>
                  itemIndex === index ? event.target.value : item,
                ),
              );
            }}
            type={type}
            value={value}
          />
          <Button
            aria-label={`Remove ${legend.toLowerCase()} ${index + 1}`}
            onClick={() => {
              onChange(values.filter((_, itemIndex) => itemIndex !== index));
            }}
            type="button"
            variant="ghost"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        className="self-start"
        onClick={() => {
          onChange([...values, ""]);
        }}
        type="button"
        variant="ghost"
      >
        {addLabel}
      </Button>
    </fieldset>
  );
}

export function ContactForm({
  initialValues,
  definitions,
  submitLabel,
  pendingLabel,
  cancelHref,
  error,
  onSubmit,
}: ContactFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [emails, setEmails] = useState<string[]>(initialValues.emails);
  const [phones, setPhones] = useState<string[]>(initialValues.phones);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialValues.socialLinks);
  const [birthday, setBirthday] = useState(initialValues.birthday ?? "");
  const [howWeMet, setHowWeMet] = useState(initialValues.howWeMet ?? "");
  const [customFields, setCustomFields] = useState<CustomFieldValues>(initialValues.customFields);
  const [submitting, setSubmitting] = useState(false);

  function replaceLink(index: number, link: SocialLink) {
    setSocialLinks(socialLinks.map((item, itemIndex) => (itemIndex === index ? link : item)));
  }

  function setCustomFieldValue(fieldId: string, value: unknown) {
    setCustomFields({ ...customFields, [fieldId]: value });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        name,
        emails: emails.filter((email) => email.trim() !== ""),
        phones: phones.filter((phone) => phone.trim() !== ""),
        socialLinks: socialLinks.filter(
          (link) => link.label.trim() !== "" || link.url.trim() !== "",
        ),
        birthday: birthday === "" ? null : birthday,
        howWeMet: howWeMet.trim() === "" ? null : howWeMet,
        customFields: valuesForSubmit(definitions, customFields),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor="contact-name">
          Name
        </label>
        <Input
          autoComplete="off"
          id="contact-name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>

      <StringListField
        addLabel="Add email"
        legend="Emails"
        onChange={setEmails}
        type="email"
        values={emails}
      />

      <StringListField
        addLabel="Add phone"
        legend="Phones"
        onChange={setPhones}
        type="tel"
        values={phones}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption text-ink-mute">Social links</legend>
        {socialLinks.map((link, index) => (
          <div className="flex items-center gap-2" key={index}>
            <Input
              aria-label={`Link ${index + 1} label`}
              className="w-32 shrink-0"
              onChange={(event) => replaceLink(index, { ...link, label: event.target.value })}
              placeholder="Instagram"
              value={link.label}
            />
            <Input
              aria-label={`Link ${index + 1} URL`}
              onChange={(event) => replaceLink(index, { ...link, url: event.target.value })}
              placeholder="https://instagram.com/..."
              value={link.url}
            />
            <Button
              aria-label={`Remove link ${index + 1}`}
              onClick={() => {
                setSocialLinks(socialLinks.filter((_, itemIndex) => itemIndex !== index));
              }}
              type="button"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          className="self-start"
          onClick={() => {
            setSocialLinks([...socialLinks, { label: "", url: "" }]);
          }}
          type="button"
          variant="ghost"
        >
          Add link
        </Button>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor="contact-birthday">
          Birthday
        </label>
        <Input
          className="w-48"
          id="contact-birthday"
          onChange={(event) => setBirthday(event.target.value)}
          type="date"
          value={birthday}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-ink-mute" htmlFor="contact-how-we-met">
          How we met
        </label>
        <Textarea
          id="contact-how-we-met"
          onChange={(event) => setHowWeMet(event.target.value)}
          rows={3}
          value={howWeMet}
        />
      </div>

      {definitions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-heading-sm text-ink">Custom fields</h2>
          {definitions.map((definition) => (
            <div className="flex flex-col gap-1.5" key={definition.id}>
              {definition.type === "multi-select" ? (
                <p className="text-caption text-ink-mute">{definition.name}</p>
              ) : (
                <label
                  className="text-caption text-ink-mute"
                  htmlFor={`custom-field-${definition.id}`}
                >
                  {definition.name}
                </label>
              )}
              <CustomFieldControl
                definition={definition}
                onChange={(value) => setCustomFieldValue(definition.id, value)}
                value={customFields[definition.id]}
              />
            </div>
          ))}
        </div>
      )}

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button disabled={submitting} type="submit">
          {submitting ? pendingLabel : submitLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link to={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
