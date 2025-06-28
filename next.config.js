/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // WASM support for crypto-js
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true
    };

    // Explicit WASM loader rule
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Important: Disable WASM optimization that causes issues
    config.optimization = {
      ...config.optimization,
      minimize: false
    };

    return config;
  },

  // Required for crypto package
  transpilePackages: [
    '@matrix-org/matrix-sdk-crypto-js',
    '@matrix-org/matrix-sdk-crypto-wasm'
  ],
}

module.exports = nextConfig