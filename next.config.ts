import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow the sandbox preview panel (space-z.ai) to request dev assets cross-origin
  allowedDevOrigins: ["*.space-z.ai"],
  typescript: {
    // Fail the production build on type errors (tsc is clean — keep it enforced)
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  async headers() {
    // X-Frame-Options SAMEORIGIN would block the sandbox preview panel (it frames
    // the app from a *.space-z.ai origin), so it is only applied in production.
    const isDev = process.env.NODE_ENV === "development";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(isDev ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Never cache admin API responses
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
