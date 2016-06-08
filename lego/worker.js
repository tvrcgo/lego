'use strict';

const koa = require('koa');

module.exports = (opts, app) => {
  const port = opts.port || 1024;
  const worker = new koa();
  // use plugins
  app.plugins.map(plugin => worker.use(plugin));
  // use middlewares
  app.middlewares.map(mw => worker.use(mw));
  // start server
  worker.listen(port);
  console.log('[worker] server start, port:%d', port);
};
