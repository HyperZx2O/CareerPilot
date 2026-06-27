/** @type {import('next').NextConfig} */
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.RENDER_API_URL || "").replace(/\/+$/, "");
let apiOrigin = "";
try {
  apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
} catch {}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID,
  },
  async rewrites() {
    const target = apiUrl || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
  async headers() {
    const clerkApi = "https://ready-gannet-55.clerk.accounts.dev";
    const clerkImg = "https://img.clerk.com";
    const connectSrc = [
      "'self'",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      clerkApi,
    ];
    if (apiOrigin) {
      connectSrc.push(apiOrigin);
    }

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${clerkApi}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' https://fonts.gstatic.com",
              `img-src 'self' data: blob: ${clerkImg}`,
              `connect-src ${connectSrc.join(" ")}`,
              `frame-src 'self' ${clerkApi}`,
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;