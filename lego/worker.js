'use strict';

const koa = require('koa');

module.exports = (opts, app) => {
  const port = opts.port || 1024;
  const worker = new koa();
  // use middlewares
  app.middlewares.map(mw => worker.use(mw));
  // start server
  worker.listen(port);
  console.log('server start, port:%d', port);
};
