import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.api.actifyr.com',
      },
      {
        protocol: 'https',
        hostname: 'api.actifyr.com',
      },
    ],
  },
  async rewrites() {
    return [
      // /api/:path* is now handled by src/app/api/[...path]/route.ts (needed
      // to attach the Authorization header from the httpOnly token cookie),
      // which takes precedence over this rewrite anyway.
      {
        source: '/program_logo/:path*',
        destination: 'https://www.api.actifyr.com/program_logo/:path*',
      },
      {
        source: '/knowledge_cards/:path*',
        destination: 'https://www.api.actifyr.com/knowledge_cards/:path*',
      },
    ];
  },
};

export default nextConfig;

