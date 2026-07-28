import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Supabase needs to be reachable for REST and for the realtime WebSocket.
 * Derived from the public env var so the policy follows the project rather than
 * being hardcoded; falls back to the wildcard host if the var is missing.
 */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  try {
    const { host } = new URL(raw);
    return { http: `https://${host}`, ws: `wss://${host}` };
  } catch {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
})();

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' is required by the blocking theme script in layout.tsx,
  // which must run before paint to avoid a flash of the wrong theme.
  // 'unsafe-eval' is only needed by React Refresh in development.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and Framer Motion both write inline style attributes.
  `style-src 'self' 'unsafe-inline'`,
  // data: for the paper-grain SVG; Google's CDN serves OAuth avatars.
  `img-src 'self' data: blob: https://lh3.googleusercontent.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin.http} ${supabaseOrigin.ws}`,
  // Ambience is generated in-browser, so no external media is ever loaded.
  `media-src 'self'`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors, but covers older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The service worker must never be served stale, or clients can get
        // stuck on an old cache strategy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
