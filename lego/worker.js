'use strict';

const koa = require('koa');

module.exports = (opts, mnt) => {
  const port = opts.port || 1024;
  const app = new koa();
  const mountwares = [].concat(
    mnt.plugins,
    mnt.services,
    mnt.middlewares
  );
  // use mount services, plugins, middlewares
  mountwares.forEach(ware => {
    if (typeof ware === 'function') {
      app.use(ware);
    }
    if (ware && ware.target) {
      const ret = ware.options ?
        ware.target.call(null, ware.options, mnt, app) :
        ware.target.call(null, mnt, app);
      if (typeof ret === 'function') {
        app.use(ret);
      }
    }
  })
  // start server
  app.listen(port);
  console.log('[worker] server start, port:%d', port);
};
