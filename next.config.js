// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

// Required for WASM crypto
const withTM = require('next-transpile-modules')([
  '@matrix-org/matrix-sdk-crypto-js'
]);

module.exports = withTM({
  webpack: (config) => {
    config.experiments = { asyncWebAssembly: true };
    return config;
  }
});