'use strict';

const koa = require('koa');

const Lego = require('./lego');

class Worker extends Lego {

  constructor(argv) {
    super(argv)
    this.mount();
  }

  start(opts) {
    const port = opts.port || 1024
    const app = new koa()
    const mountwares = [].concat(
      this.mnt.plugins,
      this.mnt.middlewares,
      this.mnt.services,
      this.mnt.routers
    )
    // use mount services, plugins, middlewares
    mountwares.forEach(ware => {
      if (typeof ware === 'function') {
        app.use(ware);
      }
      if (ware && ware.target) {
        const ret = ware.target.length === 3 ?
          ware.target.call(null, ware.options, this.mnt, app) :
          ware.target.call(null, this.mnt, app)
        if (typeof ret === 'function') {
          app.use(ret)
        }
      }
    })
    // start server
    app.listen(port)
    // notify master
    this.send({
      to: 'master',
      cmd: 'worker-start',
      pid: process.pid
    })
    // restart worker on command
    this.on('worker-restart', msg=> {
      process.exit(0)
    })
  }
}

module.exports = (opts) => {
  // start worker
  var worker = new Worker;
  worker.start(opts);
  // exception
  process.on('uncaughtException', err => {
    console.error(err.errno, err.message);
    process.exit(0);
  })
  // exit
  process.once('SIGTERM', () => {
    console.warn('[worker] Worker exit with signal SIGTERM');
    process.exit(0);
  })
}
