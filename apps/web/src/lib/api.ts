import type {
  CadenceHealth,
  Contact,
  ContactWriteInput,
  FieldDefinitionInput,
  FieldDefinitionSummary,
  ImportantDate,
  ImportantDateInput,
  ImportantDateWithContact,
  Interaction,
  InteractionInput,
  LabelSummary,
  Note,
  NoteInput,
  OnThisDay,
  InteractionAttachment,
  Reminder,
  ReminderInput,
  ReminderWithContact,
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

export async function createContact(input: ContactWriteInput): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.contact } : result;
}

export async function updateContact(
  id: string,
  input: ContactWriteInput,
): Promise<ApiResult<Contact>> {
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

export type CadenceReport = {
  defaultCadenceDays: number;
  health: CadenceHealth | null;
  catchUp: (Contact & { daysSince: number })[];
};

export async function getCadence(today: string): Promise<ApiResult<CadenceReport>> {
  return request<CadenceReport>(`/api/cadence?date=${today}`);
}

export async function getDefaultCadenceDays(): Promise<ApiResult<number>> {
  const result = await request<{ settings: { defaultCadenceDays: number } }>("/api/settings");

  return result.ok ? { ok: true, value: result.value.settings.defaultCadenceDays } : result;
}

export async function saveDefaultCadenceDays(days: number): Promise<ApiResult<number>> {
  const result = await request<{ settings: { defaultCadenceDays: number } }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify({ defaultCadenceDays: days }),
  });

  return result.ok ? { ok: true, value: result.value.settings.defaultCadenceDays } : result;
}

export async function getOnThisDay(today: string): Promise<ApiResult<OnThisDay | null>> {
  const result = await request<{ onThisDay: OnThisDay | null }>(
    `/api/interactions/on-this-day?date=${today}`,
  );

  return result.ok ? { ok: true, value: result.value.onThisDay } : result;
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

export async function listFieldDefinitions(): Promise<ApiResult<FieldDefinitionSummary[]>> {
  const result = await request<{ fields: FieldDefinitionSummary[] }>("/api/fields");

  return result.ok ? { ok: true, value: result.value.fields } : result;
}

export async function createFieldDefinition(
  input: FieldDefinitionInput,
): Promise<ApiResult<FieldDefinitionSummary>> {
  const result = await request<{ field: FieldDefinitionSummary }>("/api/fields", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.field } : result;
}

export async function updateFieldDefinition(
  id: string,
  input: FieldDefinitionInput,
): Promise<ApiResult<FieldDefinitionSummary>> {
  const result = await request<{ field: FieldDefinitionSummary }>(`/api/fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.field } : result;
}

export async function deleteFieldDefinition(id: string): Promise<ApiResult<null>> {
  return request<null>(`/api/fields/${id}`, { method: "DELETE" });
}

export async function listOpenReminders(): Promise<ApiResult<ReminderWithContact[]>> {
  const result = await request<{ reminders: ReminderWithContact[] }>("/api/reminders");

  return result.ok ? { ok: true, value: result.value.reminders } : result;
}

export async function listDoneReminders(): Promise<ApiResult<ReminderWithContact[]>> {
  const result = await request<{ reminders: ReminderWithContact[] }>("/api/reminders?status=done");

  return result.ok ? { ok: true, value: result.value.reminders } : result;
}

export async function rescheduleReminder(
  contactId: string,
  reminderId: string,
  dueOn: string,
): Promise<ApiResult<Reminder>> {
  const result = await request<{ reminder: Reminder }>(
    `/api/contacts/${contactId}/reminders/${reminderId}`,
    { method: "PATCH", body: JSON.stringify({ dueOn }) },
  );

  return result.ok ? { ok: true, value: result.value.reminder } : result;
}

export async function listContactReminders(contactId: string): Promise<ApiResult<Reminder[]>> {
  const result = await request<{ reminders: Reminder[] }>(`/api/contacts/${contactId}/reminders`);

  return result.ok ? { ok: true, value: result.value.reminders } : result;
}

export async function createReminder(
  contactId: string,
  input: ReminderInput,
): Promise<ApiResult<Reminder>> {
  const result = await request<{ reminder: Reminder }>(`/api/contacts/${contactId}/reminders`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.ok ? { ok: true, value: result.value.reminder } : result;
}

export async function tickReminder(
  contactId: string,
  reminderId: string,
): Promise<ApiResult<Reminder>> {
  const result = await request<{ reminder: Reminder }>(
    `/api/contacts/${contactId}/reminders/${reminderId}/tick`,
    { method: "POST" },
  );

  return result.ok ? { ok: true, value: result.value.reminder } : result;
}

export async function deleteReminder(
  contactId: string,
  reminderId: string,
): Promise<ApiResult<null>> {
  return request<null>(`/api/contacts/${contactId}/reminders/${reminderId}`, { method: "DELETE" });
}

export async function listImportantDates(): Promise<ApiResult<ImportantDateWithContact[]>> {
  const result = await request<{ importantDates: ImportantDateWithContact[] }>(
    "/api/important-dates",
  );

  return result.ok ? { ok: true, value: result.value.importantDates } : result;
}

export async function listContactImportantDates(
  contactId: string,
): Promise<ApiResult<ImportantDate[]>> {
  const result = await request<{ importantDates: ImportantDate[] }>(
    `/api/contacts/${contactId}/important-dates`,
  );

  return result.ok ? { ok: true, value: result.value.importantDates } : result;
}

export async function createImportantDate(
  contactId: string,
  input: ImportantDateInput,
): Promise<ApiResult<ImportantDate>> {
  const result = await request<{ importantDate: ImportantDate }>(
    `/api/contacts/${contactId}/important-dates`,
    { method: "POST", body: JSON.stringify(input) },
  );

  return result.ok ? { ok: true, value: result.value.importantDate } : result;
}

export async function deleteImportantDate(
  contactId: string,
  importantDateId: string,
): Promise<ApiResult<null>> {
  return request<null>(`/api/contacts/${contactId}/important-dates/${importantDateId}`, {
    method: "DELETE",
  });
}

export type DemoStart = {
  email: string;
  contacts: number;
};

export async function startDemo(): Promise<ApiResult<DemoStart>> {
  const result = await request<{ demo: DemoStart }>("/api/demo", { method: "POST" });

  return result.ok ? { ok: true, value: result.value.demo } : result;
}

export function photoUrl(contactId: string, version?: number): string {
  return `/api/contacts/${contactId}/photo${version === undefined ? "" : `?v=${version}`}`;
}

export function attachmentUrl(
  contactId: string,
  interactionId: string,
  attachmentId: string,
): string {
  return `/api/contacts/${contactId}/interactions/${interactionId}/attachments/${attachmentId}`;
}

export async function uploadPhoto(contactId: string, file: File): Promise<ApiResult<Contact>> {
  const result = await request<{ contact: Contact }>(photoUrl(contactId), {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });

  return result.ok ? { ok: true, value: result.value.contact } : result;
}

export async function deletePhoto(contactId: string): Promise<ApiResult<null>> {
  return request<null>(photoUrl(contactId), { method: "DELETE" });
}

export async function uploadAttachment(
  contactId: string,
  interactionId: string,
  file: File,
): Promise<ApiResult<InteractionAttachment>> {
  const result = await request<{ attachment: InteractionAttachment }>(
    `/api/contacts/${contactId}/interactions/${interactionId}/attachments?name=${encodeURIComponent(file.name)}`,
    { method: "POST", body: file, headers: { "content-type": file.type } },
  );

  return result.ok ? { ok: true, value: result.value.attachment } : result;
}

export async function deleteAttachment(
  contactId: string,
  interactionId: string,
  attachmentId: string,
): Promise<ApiResult<null>> {
  return request<null>(attachmentUrl(contactId, interactionId, attachmentId), {
    method: "DELETE",
  });
}
