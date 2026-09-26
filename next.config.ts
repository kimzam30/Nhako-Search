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
  // Google serves avatars from lh3-lh6 and other googleusercontent subdomains;
  // pinning lh3 alone silently blocked some users' pictures.
  `img-src 'self' data: blob: https://*.googleusercontent.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin.http} ${supabaseOrigin.ws}`,
  // Ambience is generated in-browser, so no external media is ever loaded.
  `media-src 'self'`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  // HTTPS-only. Never send this in development: over plain HTTP it rewrites
  // every subresource to https://, so scripts and fonts fail to load, the app
  // never hydrates, and the page renders blank apart from un-animated markup.
  `upgrade-insecure-requests`,
].join("; ");

/**
 * Headers that are safe everywhere.
 */
const baseSecurityHeaders = [
  // Redundant with frame-ancestors, but covers older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/**
 * Production-only headers.
 *
 * The CSP is deliberately not applied in development. `next dev` needs eval,
 * blob workers and an HMR WebSocket, and a dev server reached over plain HTTP
 * (or by LAN IP) is broken outright by `upgrade-insecure-requests`. HSTS is
 * equally meaningless without TLS.
 *
 * Because of this, CSP problems only appear in a production build; verify with
 * `npm run build && npm start`, not `npm run dev`.
 */
const productionOnlyHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const securityHeaders = isDev
  ? baseSecurityHeaders
  : [...baseSecurityHeaders, ...productionOnlyHeaders];

/**
 * Hosts allowed to load dev-server internals (`/_next/*`, HMR).
 *
 * Next 16 blocks these cross-origin by default. Reaching the dev server by LAN
 * IP, which is what happens when the editor runs over SSH and the browser is on
 * another machine, counts as cross-origin, so the dev runtime is blocked and
 * the app never hydrates. The page then renders only un-animated SSR markup.
 *
 * Add extra hosts with DEV_ORIGINS="10.0.0.5,my-box.local". Development only;
 * this has no effect on a production build.
 */
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(process.env.DEV_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins,
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
