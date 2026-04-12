import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  async redirects() {
    return [
      // Redirect old domain to new domain (301 permanent)
      {
        source: "/:path*",
        has: [{ type: "host", value: "vibeknowing.com" }],
        destination: "https://vibelern.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vibeknowing.com" }],
        destination: "https://vibelern.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/:path*"
            : "/api/py/",
      },
    ];
  },
};

export default nextConfig;
