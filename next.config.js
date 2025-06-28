/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // WASM support for crypto-js (client-side only)
    if (!isServer) {
      config.experiments = {
        asyncWebAssembly: true,
        syncWebAssembly: true,
        layers: true  // Required for Next.js 14+
      };
      
      // Ensure .wasm files are treated correctly
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async'
      });
    }
    return config;
  },
  // Required for crypto-js
  transpilePackages: ['@matrix-org/matrix-sdk-crypto-js'],
}

module.exports = nextConfig