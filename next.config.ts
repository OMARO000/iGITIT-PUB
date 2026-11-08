import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Served at <origin>/iris/code ("Read the code" in IRIS); the OMARO site will forward /iris/code/* here.
  basePath: "/iris/code",
};

export default nextConfig;
