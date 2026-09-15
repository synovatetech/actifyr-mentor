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
      {
        source: '/api/:path*',
        destination: 'https://www.api.actifyr.com/:path*',
      },
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

