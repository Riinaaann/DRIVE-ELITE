import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  transpilePackages: ["@workspace/api-client-react"],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:5000/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;