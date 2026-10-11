import type { NextConfig } from "next";

const apiOrigin =
  process.env.API_URL ??
  (process.env.VERCEL ? "https://aether-9snf.onrender.com" : "http://localhost:4000");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL ? apiOrigin : ""),
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
