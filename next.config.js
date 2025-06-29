const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@matrix-org/olm'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify')
    };
    return config;
  }
};

module.exports = nextConfig;