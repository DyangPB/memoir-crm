import { useEffect, useState } from "react";

export function useGoogleEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { googleEnabled?: boolean } | null) => {
        if (active && body !== null) {
          setEnabled(Boolean(body.googleEnabled));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
