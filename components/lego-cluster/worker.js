'use strict'

const join = require('path').join
const fs = require('fs')
const koa = require('koa')
const debug = require('./lib/debug')('worker')
const Lego = require('../lego')
const router = require('./router')

class Worker extends Lego {

  constructor(argv) {
    super(argv)
  }

  start(opts) {
    const port = opts.port || 1024
    const app = new koa()
    const mountwares = [].concat(
      this.mount('plugin'),
      router.routes
    )
    // use mounted plugins
    mountwares.map(ware => {
      if (typeof ware === 'function') {
        app.use(ware)
      }
      if (ware && ware.entry) {
        const ret = ware.entry.call(this, ware.options, app)
        ;[].concat(ret).map(mw => {
          if (typeof mw === 'function') {
            app.use(mw)
          }
        })
      }
    })
    // start server
    app.listen(port)

    debug.info(`Starting worker... (pid: ${process.pid})`)
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
  const worker = new Worker
  worker.start(opts)
  // exception
  process.on('uncaughtException', err => {
    console.error(err.errno, err.message)
    process.exit(0)
  })
  // exit
  process.once('SIGTERM', () => {
    console.warn('[worker] Worker exit with signal SIGTERM')
    process.exit(0)
  })
}
