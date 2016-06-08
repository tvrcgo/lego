
var webpack = require('webpack');
var path = require('path');

module.exports = {
  plugins: [],
  entry: path.resolve(__dirname, 'app/view/main.js'),
  output: {
    path: 'dist/app/public/',
    filename: 'bundle.js'
  },
  resolve: {
    root: [
      path.resolve(__dirname, 'app/component')
    ],
    extensions: ['', '.js', '.jsx', '.json']
  },
  module: {
    loaders: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel',
        query: {
          presets: ['es2015', 'stage-0', 'react']
        },
        include: [
          path.resolve(__dirname, 'app/view'),
          path.resolve(__dirname, 'app/component')
        ],
        exclude: ['node_modules']
      },
      {
        test: /\.scss$/,
        loader: 'style!css!sass?sourceMap'
      }
    ]
  }
};
