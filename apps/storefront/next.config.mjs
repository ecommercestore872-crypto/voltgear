/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
      { protocol: "https", hostname: "zeuhfqevqjkbzwdaxjuv.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: "upgrade-insecure-requests; frame-ancestors 'self'" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    const adminBase =
      process.env.ADMIN_PUBLIC_URL?.replace(/\/$/, "") ||
      (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
    const adminRedirects = adminBase
        ? [
            { source: "/admin", destination: `${adminBase}/admin`, permanent: false },
            {
              source: "/admin/:path*",
              destination: `${adminBase}/admin/:path*`,
              permanent: false,
            },
            {
              source: "/studio",
              destination: `${adminBase}/admin/login`,
              permanent: false,
            },
          ]
        : [];
    return [
      ...adminRedirects,
      { source: "/home2", destination: "/", permanent: true },
      { source: "/home2/:path*", destination: "/", permanent: true },
      { source: "/products2", destination: "/products", permanent: true },
      { source: "/products2/:category", destination: "/products/:category", permanent: true },
      { source: "/product2/:slug", destination: "/product/:slug", permanent: true },
      {
        source: "/blog/smartwatch-features-worth-paying-for",
        destination: "/blog/amoled-calling-smartwatch-pakistan",
        permanent: true,
      },
      {
        source: "/blog/true-wireless-earbuds-buying-guide",
        destination: "/blog/best-tws-earbuds-pakistan-2026",
        permanent: true,
      },
      {
        source: "/blog/gan-chargers-explained",
        destination: "/blog/65w-gan-charger-pakistan-guide",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
