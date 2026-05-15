import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["salaried-payback-both.ngrok-free.dev"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
