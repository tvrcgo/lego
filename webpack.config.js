'use strict'

const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'app/view/main.js'),
  output: {
    path: 'app/public/',
    filename: 'bundle.js'
  },
  resolve: {
    root: [
      path.resolve(__dirname, 'app/view/component')
    ],
    extensions: ['', '.js', '.jsx', '.json'],
    alias: {
      '$com': path.resolve(__dirname, 'app/view/component')
    }
  },
  module: {
    noParse: [],
    loaders: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel',
        query: {
          presets: ['es2015', 'stage-0', 'react']
        },
        include: [
          path.resolve(__dirname, 'app/view')
        ],
        exclude: ['node_modules']
      },
      {
        test: /\.scss$/,
        loader: 'style!css!sass'
      }
    ],
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDom'
  },
  plugins: []
}
