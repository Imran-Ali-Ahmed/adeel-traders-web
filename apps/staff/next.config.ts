import type { NextConfig } from "next"

// Frappe backend. Requests to /api, /files and /private/files are proxied to it, so the
// browser only ever talks to this app's origin: Frappe's session cookie (SameSite=Lax)
// and CSRF header work without CORS, and no API keys ever reach the browser (ADR-005).
const FRAPPE_URL = process.env.FRAPPE_URL ?? "http://127.0.0.1:8000"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${FRAPPE_URL}/api/:path*` },
      { source: "/files/:path*", destination: `${FRAPPE_URL}/files/:path*` },
      { source: "/private/files/:path*", destination: `${FRAPPE_URL}/private/files/:path*` },
    ]
  },
}

export default nextConfig
