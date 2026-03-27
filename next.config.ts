import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Web-Harmonium',
  assetPrefix: '/Web-Harmonium/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
