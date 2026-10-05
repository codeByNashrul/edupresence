import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["salaried-payback-both.ngrok-free.dev"],

  transpilePackages: ["@prisma/client"],

  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/@prisma/client/runtime/query_engine_bg.*",

      "./node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.*",
      "./node_modules/@prisma/client/runtime/query_compiler_bg.mysql.*",
      "./node_modules/@prisma/client/runtime/query_compiler_bg.sqlite.*",
      "./node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.*",
    ],
  },
};

export default withSerwist(nextConfig);
