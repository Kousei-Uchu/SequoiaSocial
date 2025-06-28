// next.config.js
module.exports = {
  webpack: (config) => {
    // Add WASM support
    config.experiments = { 
      ...config.experiments, 
      asyncWebAssembly: true 
    };
    
    // Add file-loader for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'javascript/auto',
      loader: 'file-loader',
      options: {
        name: 'static/wasm/[name].[hash:8].[ext]',
        publicPath: '/_next/',
      },
    });

    return config;
  },
};