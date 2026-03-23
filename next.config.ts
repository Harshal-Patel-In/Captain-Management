import type { NextConfig } from "next";

const backendOrigin =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Allow access from network IP during development
  // @ts-ignore - Valid config in Next.js 16+ but types might be outdated
  allowedDevOrigins: ["localhost:3000", "192.168.56.1:3000", "0.0.0.0:3000", "192.168.56.1", "http://192.168.56.1:3000"],

  // Proxy API requests to backend to avoid CORS/Network issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
