// Thin client for Frappe's REST API. Business rules live in Frappe; this file only
// sends requests and turns Frappe errors into readable messages.

export class FrappeError extends Error {
  constructor(
    message: string,
    public status: number,
    public type?: string
  ) {
    super(message)
  }
}

let csrfToken: string | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim()
}

function errorMessage(body: Record<string, unknown>, status: number): string {
  const raw = body._server_messages
  if (typeof raw === "string") {
    try {
      const messages = (JSON.parse(raw) as string[]).map((m) => {
        try {
          return stripHtml((JSON.parse(m) as { message?: string }).message ?? m)
        } catch {
          return stripHtml(m)
        }
      })
      if (messages.length) return messages.join("\n")
    } catch {
      /* fall through */
    }
  }
  if (typeof body.message === "string") return stripHtml(body.message)
  if (status === 403) return "You don't have permission to do this."
  if (status === 401) return "Your session has ended. Please sign in again."
  return "Something went wrong. Please try again."
}

async function handle<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  if (!response.ok) {
    throw new FrappeError(
      errorMessage(body, response.status),
      response.status,
      typeof body.exc_type === "string" ? body.exc_type : undefined
    )
  }
  return body.message as T
}

type Params = Record<string, string | number | boolean | null | undefined>

export async function get<T>(method: string, params: Params = {}): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, String(value))
  }
  const response = await fetch(`/api/method/${method}?${query}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
  return handle<T>(response)
}

/** Like get(), for the few Frappe calls that answer outside "message" (getdoctype uses "docs"). */
export async function getRaw<T>(
  method: string,
  params: Params = {}
): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, String(value))
  }
  const response = await fetch(`/api/method/${method}?${query}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  if (!response.ok) {
    throw new FrappeError(
      errorMessage(body, response.status),
      response.status,
      typeof body.exc_type === "string" ? body.exc_type : undefined
    )
  }
  return body as T
}

export async function post<T>(
  method: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`/api/method/${method}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  })
  return handle<T>(response)
}

/** Upload a file with Frappe's standard upload_file, attached to a document. */
export async function uploadFile(
  file: File,
  attach: { doctype: string; name: string; isPrivate?: boolean }
): Promise<{ file_url: string; name: string }> {
  const form = new FormData()
  form.append("file", file, file.name)
  form.append("doctype", attach.doctype)
  form.append("docname", attach.name)
  form.append("is_private", attach.isPrivate ? "1" : "0")
  const response = await fetch("/api/method/upload_file", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
    },
    body: form,
  })
  return handle<{ file_url: string; name: string }>(response)
}

export function login(usr: string, pwd: string) {
  return post<string>("login", { usr, pwd })
}

export async function logout() {
  await post("logout").catch(() => undefined)
  setCsrfToken(null)
}
