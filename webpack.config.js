
var webpack = require('webpack');

module.exports = {
  plugins: [],
  entry: {
    view: '.'
  },
  output: {
    path: 'dist/public',
    filename: '[name].js'
  },
  module: {
    loaders: [
      { test: /\.scss$/, loader: 'style!css!sass?sourceMap'}
    ]
  }
};
