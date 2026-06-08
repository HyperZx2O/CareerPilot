/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // (The dev-only "cheap-module-source-map" override was removed on
  //  2026-06-07: it caused a "Reverting webpack devtool" warning, and
  //  the underlying atob() error it was added to fix was actually caused
  //  by a corrupted Clerk publishable key, not by the devtool.)
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Clerk v5 loads clerk-js from <instance>.clerk.accounts.dev
              // (the Frontend API host baked into the publishable key),
              // NOT from js.clerk.com (that legacy CDN still exists but is
              // not used for v5 dev keys). Both must be allowed.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.accounts.dev",
              // Clerk v5 Frontend API (FAPI) is at <instance>.clerk.accounts.dev.
              // api.clerk.dev is the legacy/management host and api.clerk.com is
              // the newer alias. Allow the wildcard so any instance hostname
              // baked into NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY works.
              "connect-src 'self' https://api.clerk.dev https://api.clerk.com https://*.clerk.accounts.dev wss://*.clerk.accounts.dev",
              // Account portal redirects + Clerk's hosted sign-in iframe need
              // the instance host framable.
              "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self' https://*.clerk.accounts.dev",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;