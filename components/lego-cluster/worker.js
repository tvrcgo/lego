'use strict'

const join = require('path').join
const fs = require('fs')
const koa = require('koa')
const router = require('koa-router')()
const debug = require('./lib/debug')('worker')
const Lego = require('../lego')

class Worker extends Lego {

  constructor(argv) {
    super(argv)
  }

  mntRouters() {
    const routers = this.map('router')
    let routes
    let entries = {}
    routers.map(r => {
      if (r.name === '_') {
        routes = r.entry
      } else {
        entries[r.name] = r.entry
      }
    })
    if (routes) {
      // invoke router
      routes.call(null, router, entries)
      // use router middleware
      return [router.routes(), router.allowedMethods({ throw: true })]
    }
    return []
  }

  mntServices() {
    const services = this.map('service')
    return services
      .map(serv => {
        const entry = serv.entry
        serv.options = this.config
        serv.entry = (options, app) => {
          // mount services on ctx.service.*
          if (typeof app.context.service !== 'object') {
            app.context.service = {}
          }
          // mount ctx.service.[name]
          app.context.service[serv.name] = entry.call(this, options)
        }
        return serv
      })
  }

  start(opts) {
    const port = opts.port || 1024
    const app = new koa()
    const mountwares = [].concat(
      this.mount('plugin'),
      this.mntServices(),
      this.mntRouters()
    )
    // use mount services, plugins, middlewares
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
