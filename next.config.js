// next.config.js
const webpack = require('webpack');

module.exports = {
  // Enable WebAssembly support
  experimental: {
    serverComponentsExternalPackages: ['@matrix-org/olm'],
    outputFileTracingIncludes: {
      '**/*': ['node_modules/@matrix-org/olm/olm.wasm']
    }
  },

  webpack: (config, { isServer, dev }) => {
    // Important: Return the modified config
    config = {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          // Add fallbacks for Node.js modules used by Matrix SDK
          fs: false,
          path: false,
          crypto: require.resolve('crypto-browserify'),
          stream: require.resolve('stream-browserify'),
          vm: require.resolve('vm-browserify')
        }
      }
    };

    // Enable WebAssembly support
    config.experiments = { 
      ...config.experiments, 
      asyncWebAssembly: true,
      syncWebAssembly: true
    };

    // Add file-loader for WASM files (only in production)
    if (!dev) {
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'javascript/auto',
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'static/wasm/[name].[hash:8].[ext]',
              publicPath: '/_next/',
              emitFile: !isServer
            }
          }
        ]
      });
    }

    // Add fallback for process (used by some dependencies)
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
      })
    );

    return config;
  }
};