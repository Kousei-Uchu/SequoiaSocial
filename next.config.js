/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true
    };
    return config;
  },
  transpilePackages: ['@matrix-org/matrix-sdk-crypto']
}

module.exports = nextConfig