import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sharp"],
  allowedDevOrigins: ["192.168.86.39"]
};

export default nextConfig;
