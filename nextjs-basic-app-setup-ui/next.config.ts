import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ Permitir que el build continúe aunque haya errores de TypeScript
    ignoreBuildErrors: false,
  },
  eslint: {
    // ⚠️ Permitir que el build continúe aunque haya errores de ESLint
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
