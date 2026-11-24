import type { NextConfig } from "next";

// Адрес ASP.NET Core API. Браузер обращается к /api/* на том же домене,
// а Next.js проксирует запросы — аналог nginx-прокси из схемы развёртывания (п. 2.2 диплома).
const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:5199";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
