import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // BACKEND_URL é usado apenas no servidor (não expõe para o cliente)
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    return [
      {
        // Todas as chamadas /api/* vão para o backend
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
