'use strict';

const koa = require('koa');

module.exports = (opts, mnt) => {
  const port = opts.port || 1024;
  const app = new koa();
  const mountwares = [].concat(
    mnt.plugins,
    mnt.middlewares,
    mnt.services,
    mnt.routers
  );
  // use mount services, plugins, middlewares
  mountwares.forEach(ware => {
    if (typeof ware === 'function') {
      app.use(ware);
    }
    if (ware && ware.target) {
      const ret = ware.target.length === 3 ?
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
  // exception
  process.on('uncaughtException', err => {
    console.error(err.errno, err.message);
    process.exit(0);
  });
  // exit
  process.once('SIGTERM', () => {
    console.warn('[worker] worker exit with signal SIGTERM');
    process.exit(0);
  });
};
