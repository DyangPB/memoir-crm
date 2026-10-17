import { useState } from "react";

import { photoUrl } from "../lib/api";
import { cn } from "../lib/utils";
import { avatarSizeClass, LetterAvatar } from "./letter-avatar";

type ContactAvatarProps = {
  contact: { id: string; name: string; photoVersion: number | null };
  size?: "md" | "lg";
};

/** The Contact's photo, or their letter when they have none or it won't load. */
export function ContactAvatar({ contact, size = "md" }: ContactAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = photoUrl(contact.id, contact.photoVersion ?? undefined);

  if (contact.photoVersion === null || failedUrl === url) {
    return <LetterAvatar name={contact.name} size={size} />;
  }

  return (
    <img
      alt=""
      className={cn(
        "shrink-0 rounded-full border border-hairline object-cover",
        avatarSizeClass[size],
      )}
      onError={() => setFailedUrl(url)}
      src={url}
    />
  );
}
