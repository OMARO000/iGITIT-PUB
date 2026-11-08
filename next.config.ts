import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Served at omaro.xyz/igitit (the OMARO site forwards /igitit/* here).
  basePath: "/igitit",
};

export default nextConfig;
