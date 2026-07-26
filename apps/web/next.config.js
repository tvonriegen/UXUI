/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose only NEXT_PUBLIC_ vars to the browser (default Next.js behaviour)
  // The service role key must NEVER have NEXT_PUBLIC_ prefix.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN:        process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "X-XSS-Protection",        value: "1; mode=block" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://sentry.io",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // CORS for API routes — only allow same origin in production
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-CSRF-Token" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
