import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  output: "standalone",
};

export default nextConfig;
