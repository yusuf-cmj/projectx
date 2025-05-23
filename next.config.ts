import type { NextConfig } from "next";

/**
 * Next.js Yapılandırması
 * 
 * Bu dosya, Node.js sunucu modüllerinin istemci tarafında derlenmesini önlemek için
 * webpack yapılandırmasını özelleştirir. MySQL2 gibi sunucu-taraflı modülleri
 * yalnızca sunucu bileşenlerinde kullanmamızı sağlar.
 */
const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Sunucu olmayan (client tarafı) derlemeler için
    if (!isServer) {
      // MySQL ve Prisma gibi sunucu taraflı modülleri boş modüllerle değiştir
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        readline: false,
      };
    }
    return config;
  },
  // Add image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/repliq-user/**', // Allow images from this GCS bucket path
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google User profile images
        port: '',
        pathname: '/**',
      },
    ],
    // Deprecated alternative (use remotePatterns if possible):
    // domains: ['storage.googleapis.com', 'lh3.googleusercontent.com'],
  },
};

export default nextConfig;
