import { NextResponse, type NextRequest } from "next/server"

// Convenience redirect only. Real authorization happens in Frappe on every API call
// (Next.js docs: never rely on Proxy alone for auth).
export function proxy(request: NextRequest) {
  const sid = request.cookies.get("sid")?.value
  const loggedIn = Boolean(sid) && sid !== "Guest"
  const { pathname } = request.nextUrl

  if (!loggedIn && pathname !== "/login") {
    const url = new URL("/login", request.url)
    if (pathname !== "/") url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  if (loggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/products", request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Skip Frappe-proxied paths, Next internals and static files.
  matcher: ["/((?!api|files|private|_next/static|_next/image|favicon.ico).*)"],
}
