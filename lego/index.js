'use strict';

const EventEmitter = require('events');
const cluster = require('cluster');
const os = require('os');
const join = require('path').join;
const fs = require('fs');
const koa = require('koa');
const serve = require('koa-static');
const mount = require('koa-mount');
const router = require('koa-router')();

const worker = join(__dirname, 'worker.js');

class Lego extends EventEmitter {

  constructor() {
    super()
    this.mnt = {};
    this.root = process.cwd();
  }

  start(opts) {
    opts = opts || {};
    if (cluster.isMaster) {
      const cpuCount = os.cpus().length;
      const workerCount = opts.workerCount || cpuCount;
      for(let i=0; i<workerCount; i++) {
        cluster.fork();
      }
      // reboot on crashed.
      cluster.on('exit', (worker, code) => {
        console.error('[master] cluster worker %d died (%d)', worker.id, code);
        cluster.fork();
        console.info('[master] restart worker.');
      });
    }
    else {
      // load config
      this.mnt.config = this.loadConfig();
      // mount plugins
      this.mnt.plugins = this.mountPlugins();
      // mount services
      this.mnt.services = this.mountServices();
      // mount middlewares
      this.mnt.middlewares = this.mountMiddlewares();
      // mount routers
      this.mnt.routers = this.mountRouters();
      // start worker
      require(worker)(opts, this.mnt);
    }
  }

  loadConfig() {
    const configPath = join(this.root, '/config/config');
    const mountPath = join(this.root, '/config/mount');
    return Object.assign({
      env: process.env.ENV || 'develop'
    },
      require(configPath),
      require(mountPath)
    );
  }

  mountPlugins() {
    const pluginRoot = join(this.root, '/app/plugin');
    if (!access(pluginRoot)) {
      console.warn('no plugin directory.');
      return [];
    }
    const pluginConfig = this.mnt.config.plugin;
    // app/plugin/*
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
        };
        if (tar.length === 3) {
          ret.options = plugin.options || {};
        }
        return ret;
      }) : [];
    // static service
    if (pluginConfig.static) {
      plugins.push(mount('/public', serve(join(this.root, '/app/public'))));
    }
    return plugins;
  }

  mountMiddlewares() {
    const mwRoot = join(this.root, '/app/middleware');
    if (!access(mwRoot)) {
      console.warn('no middleware directory.');
      return [];
    }
    const mwConfig = this.mnt.config.middleware;
    // app/middleware/*
    return mwConfig && typeof mwConfig === 'object' ?
      Object.keys(mwConfig).map((name) => {
        return {
          name: name,
          target: require(join(mwRoot, name)),
          options: mwConfig[name]
        };
      }) : [];
  }

  mountRouters() {
    const routerRoot = join(this.root, '/app/router');
    if (!access(routerRoot)) {
      console.warn('no router directory.');
      return [];
    }
    const routers = fs.readdirSync(routerRoot);
    let routerCtrl = {};
    routers
      .filter(r => r !== '_')
      .map(r => r.replace(/\.js$/g, ''))
      .forEach(r => {
        routerCtrl[r] = require(join(routerRoot, r));
      });
    require(join(routerRoot, '/_'))(router, routerCtrl);
    return [router.routes(), router.allowedMethods({ throw: true })];
  }

  mountServices() {
    const serviceRoot = join(this.root, '/app/service');
    if (!access(serviceRoot)) {
      console.warn('no service directory.');
      return [];
    }
    const services = fs.readdirSync(serviceRoot);
    return services ?
      services.map(serv => {
        serv = serv.replace(/\.js$/, '');
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
      }) : [];
  }

}

function access(path) {
  try {
    fs.accessSync(path, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = new Lego;
