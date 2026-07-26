import path from "node:path";

import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

function getSupabaseConnectSources() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) {
    return [];
  }

  try {
    const httpUrl = new URL(configuredUrl);
    const websocketUrl = new URL(configuredUrl);
    websocketUrl.protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
    return [httpUrl.origin, websocketUrl.origin];
  } catch {
    return [];
  }
}

const connectSources = [
  "'self'",
  ...getSupabaseConnectSources(),
  ...(isDevelopment
    ? [
        "http://localhost:*",
        "http://127.0.0.1:*",
        "ws://localhost:*",
        "ws://127.0.0.1:*"
      ]
    : [])
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src ${connectSources.join(" ")}`,
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob: https:",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:"
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.NEXT_DIST_DIR ?? (isDevelopment ? ".next-dev" : ".next"),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" }
        ]
      }
    ];
  },
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  poweredByHeader: false,
  typedRoutes: true
};

export default nextConfig;
