import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./corpus/**/*"],
  },
};

export default nextConfig;
