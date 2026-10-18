import { actAs } from "../lib/session";

export type ApiResult = { ok: boolean; status: number; body: unknown };

/** Runs one request against Memoir's own /api as the key's owner. */
export type ApiCall = (method: string, path: string, body?: unknown) => Promise<ApiResult>;

export type Dispatch = (request: Request) => Response | Promise<Response>;

export function apiCallFor(dispatch: Dispatch, origin: string, userId: string): ApiCall {
  return async (method, path, body) => {
    const request = actAs(
      new Request(`${origin}/api${path}`, {
        method,
        ...(body !== undefined
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      }),
      { id: userId },
    );
    const response = await dispatch(request);

    return {
      ok: response.ok,
      status: response.status,
      body: response.status === 204 ? null : await response.json().catch(() => null),
    };
  };
}
