'use strict';

const join = require('path').join
const fs = require('fs')
const koa = require('koa')
const serve = require('koa-static')
const mount = require('koa-mount')
const router = require('koa-router')()
const Lego = require('../lego')

class Worker extends Lego {

  constructor(argv) {
    super(argv)
  }

  mntMiddlewares() {
    const middlewares = this.mount('middleware')
    const mwConfig = this.mnt.config.middleware || {}
    return middlewares
      .filter(mw => !!mwConfig[mw.name])
      .map(mw => {
        return Object.assign(mw, {
          options: mwConfig[mw.name]
        })
      })
  }

  mntRouters() {
    const routers = this.mount('router')
    let entry
    let target = {}
    routers
      .forEach(r => {
        if (r.name === '_') {
          entry = r.target
        }
        else {
          target[r.name] = r.target
        }
      })
    if (entry) {
      // invoke router
      entry.call(null, router, target)
      // use router middleware
      return [router.routes(), router.allowedMethods({ throw: true })]
    }
    return []
  }

  mntPlugins() {
    const pluginConfig = this.mnt.config.plugin || {}
    let plugins = pluginConfig && typeof pluginConfig === 'object' ?
      Object
        .keys(pluginConfig)
        .filter(key => {
          // active plugins
          const conf = pluginConfig[key]
          return (conf.enable || conf.enable === undefined) && (conf.path || conf.package)
        })
        .map(key => {
          // mount plugins
          let plugin
          const conf = pluginConfig[key]
          if (conf.path) {
            const pluginPath = join(this.root, '/app/plugin', conf.path)
            if (this.access(pluginPath)) {
              plugin = require(pluginPath)
            }
          }
          if (conf.package) {
            plugin = require(conf.package)
          }
          let ret = {
            name: conf.name,
            target: plugin
          }
          if (plugin.length === 3) {
            ret.options = conf.options || {}
          }
          return ret
        }) : []
    // static assets
    if (pluginConfig.static) {
      plugins.push(mount('/public', serve(join(this.root, '/app/public'))))
    }
    return plugins
  }

  mntServices() {
    const services = this.mount('service')
    return services
      .map(serv => {
        const tar = serv.target
        serv.target = (mnt, app) => {
          // mount services on ctx.service.*
          if (typeof app.context.service !== 'object') {
            app.context.service = {}
          }
          // mount ctx.service.[name]
          app.context.service[serv.name] = tar
        }
        return serv
      })
  }

  start(opts) {
    const port = opts.port || 1024
    const app = new koa()
    const mountwares = [].concat(
      this.mntPlugins(),
      this.mntMiddlewares(),
      this.mntServices(),
      this.mntRouters()
    )
    // use mount services, plugins, middlewares
    mountwares.forEach(ware => {
      if (typeof ware === 'function') {
        app.use(ware)
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
