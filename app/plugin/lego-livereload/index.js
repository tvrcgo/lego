'use strict';

const join = require('path').join;
const root = process.cwd();
const browserSync = require('browser-sync');
const bs = browserSync.create();

module.exports = (mnt, app) => {
  bs.init({
    proxy: '127.0.0.1:' + mnt.options.port
  })
}
