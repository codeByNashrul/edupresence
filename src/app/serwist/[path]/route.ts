import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();

const revision = gitRevision || randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      {
        url: "/~offline",
        revision,
      },
    ],

    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
