import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Configurar para evitar problemas con Konva en el servidor
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Excluir módulos que requieren canvas del lado del servidor
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas']
    }
    
    return config
  },
}

export default nextConfig