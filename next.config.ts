import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
