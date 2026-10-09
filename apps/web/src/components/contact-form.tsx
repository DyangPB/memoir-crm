import type { ContactInput, SocialLink } from "@memoir/core";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export const emptyContactInput: ContactInput = {
  name: "",
  emails: [],
  phones: [],
  socialLinks: [],
  birthday: null,
  howWeMet: null,
};

type ContactFormProps = {
  initialValues: ContactInput;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  error: string | null;
  onSubmit: (values: ContactInput) => Promise<void>;
};

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
  const [submitting, setSubmitting] = useState(false);

  function replaceLink(index: number, link: SocialLink) {
    setSocialLinks(socialLinks.map((item, itemIndex) => (itemIndex === index ? link : item)));
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
