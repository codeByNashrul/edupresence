import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["salaried-payback-both.ngrok-free.dev"],
  serverExternalPackages: ["@prisma/client"],
};

export default withSerwist(nextConfig);
