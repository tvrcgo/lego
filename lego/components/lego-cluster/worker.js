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
    const mwRoot = join(this.root, '/app/middleware')
    if (!access(mwRoot)) {
      console.warn('no middleware directory.')
      return []
    }
    // app/middleware/*
    const mwConfig = this.mnt.config.middleware
    this.mnt.middlewares = mwConfig && typeof mwConfig === 'object' ?
      Object.keys(mwConfig).map((name) => {
        return {
          name: name,
          target: require(join(mwRoot, name)),
          options: mwConfig[name]
        };
      }) : []
    return this.mnt.middlewares
  }

  mntRouters() {
    const routerRoot = join(this.root, '/app/router');
    if (!access(routerRoot)) {
      console.warn('no router directory.');
      return [];
    }
    // app/router/*
    const routers = fs.readdirSync(routerRoot);
    let routerCtrl = {};
    routers
      .filter(r => r !== '_')
      .map(r => r.replace(/\.js$/g, ''))
      .forEach(r => {
        routerCtrl[r] = require(join(routerRoot, r));
      });
    require(join(routerRoot, '/_'))(router, routerCtrl);
    this.mnt.routers = [router.routes(), router.allowedMethods({ throw: true })]
    return this.mnt.routers
  }

  mntPlugins() {
    const pluginRoot = join(this.root, '/app/plugin');
    if (!access(pluginRoot)) {
      console.warn('no plugin directory.');
      return [];
    }
    // app/plugin/*
    const pluginConfig = this.mnt.config.plugin;
    let plugins = pluginConfig && typeof pluginConfig === 'object' ?
      Object.keys(pluginConfig).filter(key => {
        // filter active plugins
        const plugin = pluginConfig[key];
        return (plugin.enable || plugin.enable === undefined) && (plugin.path || plugin.package)
      }).map(key => {
        // mount plugins
        const plugin = pluginConfig[key];
        let tar;
        if (plugin.path) {
          tar = require(join(pluginRoot, plugin.path));
        }
        if (plugin.package) {
          tar = require(plugin.package);
        }
        let ret = {
          name: plugin.name,
          target: tar
        }
        if (tar.length === 3) {
          ret.options = plugin.options || {};
        }
        return ret
      }) : [];
    // static assets
    if (pluginConfig.static) {
      plugins.push(mount('/public', serve(join(this.root, '/app/public'))));
    }
    this.mnt.plugins = plugins
    return this.mnt.plugins
  }

  mntServices() {
    const serviceRoot = join(this.root, '/app/service')
    if (!access(serviceRoot)) {
      console.warn('no service directory.')
      return []
    }
    // app/service/*
    const services = fs.readdirSync(serviceRoot)
    this.mnt.services = services ?
      services.map(serv => {
        serv = serv.replace(/\.js$/, '')
        return {
          name: serv,
          target: (mnt, app) => {
            // mount services on ctx.service.*
            if (typeof app.context.service !== 'object') {
              app.context.service = {};
            }
            // mount ctx.service.[name]
            app.context.service[serv] = require(join(serviceRoot, serv));
          }
        }
      }) : []
    return this.mnt.services
  }

  mntJobs() {
    const jobRoot = join(this.root, '/app/job')
    if (!access(jobRoot)) {
      return []
    }
    const jobs = fs.readdirSync(jobRoot)
    this.mnt.jobs = jobs ?
      jobs.map(name => {
        name = name.replace(/\.js$/, '')
        const job = require(join(jobRoot, name))
        return {
          name: name,
          target: job
        }
      }) : []
    return this.mnt.jobs
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

function access(path) {
  try {
    fs.accessSync(path, fs.F_OK)
    return true
  } catch (e) {
    console.error('[ACCEERR]', e)
    return false
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
