/** Messages from the command palette to the products page. */
export const PRODUCTS_COMMAND_EVENT = "adeel:products-command"

export type ProductsCommand = { search?: string; create?: boolean }

/** Reads (and clears) a command that arrived through the URL, e.g. /products?q=lipstick. */
export function takeUrlCommand(): ProductsCommand | null {
  const params = new URLSearchParams(window.location.search)
  const search = params.get("q") ?? undefined
  const create = params.get("new") === "1"
  if (!search && !create) return null
  window.history.replaceState(null, "", window.location.pathname)
  return { search, create }
}
