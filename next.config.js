/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@matrix-org/olm'],
    webpackBuildWorker: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false
      }
    }
    
    // Add this alias
    config.resolve.alias = {
      ...config.resolve.alias,
      'olm': '@matrix-org/olm'
    }
    
    return config
  }
}

module.exports = nextConfig