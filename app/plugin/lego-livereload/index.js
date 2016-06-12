'use strict';

const webpack = require('webpack');
const convert = require('koa-convert');
const hotMiddleware = require('webpack-hot-middleware');
const join = require('path').join;

const root = process.cwd();
const webpackConfig = require(join(root, '/webpack.config'));
const compiler = webpack(webpackConfig);

module.exports = convert(hotMiddleware(compiler));
