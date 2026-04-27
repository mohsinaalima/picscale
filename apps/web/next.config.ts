// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ["picscale.local"],
  },
};

export default nextConfig;
