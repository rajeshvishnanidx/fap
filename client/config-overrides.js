const path = require('path');

module.exports = function override(config, env) {
  // Check if we're building the widget
  if (process.env.REACT_APP_BUILD_TARGET === 'widget') {
    // Change the entry point
    config.entry = './src/components/ChatWidget.js';
    
    // Change the output
    config.output = {
      ...config.output,
      filename: 'widget.js',
      path: path.resolve(__dirname, 'public'),
      library: 'ChatWidget',
      libraryTarget: 'umd',
      publicPath: '/',
    };

    // Externalize React and ReactDOM
    config.externals = {
      react: 'React',
      'react-dom': 'ReactDOM',
      axios: 'axios',
    };
  }

  return config;
}; 