import type { NextConfig } from "next";

const runtimeDistDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  distDir:
    runtimeDistDir && runtimeDistDir.length > 0 ? runtimeDistDir : ".next",
};

export default nextConfig;
