import { isInlineImage, type InteractionAttachment } from "@memoir/core";
import { useId, useRef } from "react";

import { attachmentUrl } from "../lib/api";
import { formatBytes } from "../lib/format";
import { Icon } from "./icon";
import { Button } from "./ui/button";

type AttachmentListProps = {
  contactId: string;
  attachments: InteractionAttachment[];
  onRemove: (attachment: InteractionAttachment) => void;
};

/** Images show inline in the Timeline; every other file is a download chip. */
export function AttachmentList({ contactId, attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-start gap-3">
      {attachments.map((attachment) => {
        const url = attachmentUrl(contactId, attachment.interactionId, attachment.id);

        return (
          <li className="flex max-w-full items-start gap-1" key={attachment.id}>
            {isInlineImage(attachment.contentType) ? (
              <a href={url} rel="noreferrer" target="_blank">
                <img
                  alt={attachment.fileName}
                  className="max-h-48 max-w-full rounded-md border border-hairline object-cover"
                  loading="lazy"
                  src={url}
                />
              </a>
            ) : (
              <a
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-hairline-input bg-canvas px-3 py-1.5 text-caption text-ink-secondary transition-colors hover:bg-canvas-soft"
                download={attachment.fileName}
                href={url}
              >
                <Icon className="text-base text-ink-mute" name="attach_file" />
                <span className="truncate">{attachment.fileName}</span>
                <span className="tabular-nums text-ink-mute">{formatBytes(attachment.size)}</span>
              </a>
            )}
            <button
              aria-label={`Remove ${attachment.fileName}`}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onRemove(attachment)}
              type="button"
            >
              <Icon className="text-base" name="close" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type AttachButtonProps = {
  busy: boolean;
  onPick: (file: File) => void;
  label?: string;
  pendingLabel?: string;
  accept?: string;
  /** Spoken name for the button when several of them share the same visible label. */
  ariaLabel?: string;
};

export function AttachButton({
  busy,
  onPick,
  label = "Attach file",
  pendingLabel = "Attaching",
  accept,
  ariaLabel,
}: AttachButtonProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        accept={accept}
        aria-hidden
        className="sr-only"
        disabled={busy}
        id={id}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file !== undefined) {
            onPick(file);
          }

          event.target.value = "";
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <Button
        aria-label={ariaLabel}
        disabled={busy}
        onClick={() => input.current?.click()}
        variant="ghost"
      >
        {busy ? pendingLabel : label}
      </Button>
    </>
  );
}
