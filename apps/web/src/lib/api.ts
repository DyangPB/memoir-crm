import type { Contact, ContactInput } from "@memoir/core";

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

export async function listContacts(): Promise<ApiResult<Contact[]>> {
  const result = await request<{ contacts: Contact[] }>("/api/contacts");

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
