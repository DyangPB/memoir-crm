import type {
  Contact,
  ContactInput,
  Interaction,
  InteractionInput,
  LabelSummary,
  Note,
  NoteInput,
} from "@memoir/core";

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "That didn't reach Memoir. Check your connection and try again.",
    };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "That didn't work. Try again.",
    };
  }

  if (response.status === 204) {
    return { ok: true, value: null as T };
  }

  return { ok: true, value: (await response.json()) as T };
}

export async function listContacts(params?: {
  q?: string;
  label?: string;
}): Promise<ApiResult<Contact[]>> {
  const search = new URLSearchParams();

  if (params?.q !== undefined && params.q !== "") {
    search.set("q", params.q);
  }

  if (params?.label !== undefined) {
    search.set("label", params.label);
  }

  const suffix = search.toString() === "" ? "" : `?${search.toString()}`;
  const result = await request<{ contacts: Contact[] }>(`/api/contacts${suffix}`);

  return result.ok ? { ok: true, value: result.value.contacts } : result;
}

export async function getContact(id: string): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>(`/api/contacts/${id}`);

  return result.ok ? { ok: true, value: result.value.contact } : result;
}

export async function createContact(input: ContactInput): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.contact } : result;
}

export async function updateContact(id: string, input: ContactInput): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>(`/api/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.contact } : result;
}

export async function deleteContact(id: string): Promise<ApiResult<null>> {
  return request<null>(`/api/contacts/${id}`, { method: "DELETE" });
}

export async function listInteractions(contactId: string): Promise<ApiResult<Interaction[]>> {
  const result = await request<{ interactions: Interaction[] }>(
    `/api/contacts/${contactId}/interactions`,
  );

  return result.ok ? { ok: true, value: result.value.interactions } : result;
}

export async function createInteraction(
  contactId: string,
  input: InteractionInput,
): Promise<ApiResult<Interaction>> {
  const result = await request<{ interaction: Interaction }>(
    `/api/contacts/${contactId}/interactions`,
    { method: "POST", body: JSON.stringify(input) },
  );

  return result.ok ? { ok: true, value: result.value.interaction } : result;
}

export async function updateInteraction(
  contactId: string,
  interactionId: string,
  input: InteractionInput,
): Promise<ApiResult<Interaction>> {
  const result = await request<{ interaction: Interaction }>(
    `/api/contacts/${contactId}/interactions/${interactionId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );

  return result.ok ? { ok: true, value: result.value.interaction } : result;
}

export async function deleteInteraction(
  contactId: string,
  interactionId: string,
): Promise<ApiResult<null>> {
  return request<null>(`/api/contacts/${contactId}/interactions/${interactionId}`, {
    method: "DELETE",
  });
}

export async function listNotes(contactId: string): Promise<ApiResult<Note[]>> {
  const result = await request<{ notes: Note[] }>(`/api/contacts/${contactId}/notes`);

  return result.ok ? { ok: true, value: result.value.notes } : result;
}

export async function createNote(contactId: string, input: NoteInput): Promise<ApiResult<Note>> {
  const result = await request<{ note: Note }>(`/api/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.note } : result;
}

export async function updateNote(
  contactId: string,
  noteId: string,
  input: NoteInput,
): Promise<ApiResult<Note>> {
  const result = await request<{ note: Note }>(`/api/contacts/${contactId}/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.note } : result;
}

export async function deleteNote(contactId: string, noteId: string): Promise<ApiResult<null>> {
  return request<null>(`/api/contacts/${contactId}/notes/${noteId}`, { method: "DELETE" });
}

export async function listLabels(): Promise<ApiResult<LabelSummary[]>> {
  const result = await request<{ labels: LabelSummary[] }>("/api/labels");

  return result.ok ? { ok: true, value: result.value.labels } : result;
}

export async function createLabel(name: string): Promise<ApiResult<LabelSummary>> {
  const result = await request<{ label: LabelSummary }>("/api/labels", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  return result.ok ? { ok: true, value: result.value.label } : result;
}

export async function updateLabel(id: string, name: string): Promise<ApiResult<LabelSummary>> {
  const result = await request<{ label: LabelSummary }>(`/api/labels/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });

  return result.ok ? { ok: true, value: result.value.label } : result;
}

export async function deleteLabel(id: string): Promise<ApiResult<null>> {
  return request<null>(`/api/labels/${id}`, { method: "DELETE" });
}

export async function setContactLabels(
  contactId: string,
  labelIds: string[],
): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>(`/api/contacts/${contactId}/labels`, {
    method: "PUT",
    body: JSON.stringify({ labelIds }),
  });

  return result.ok ? { ok: true, value: result.value.contact } : result;
}
