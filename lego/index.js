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
      for(var i=0; i<workerCount; i++) {
        cluster.fork();
      }
      // reboot on crashed.
      cluster.on('exit', (worker, code) => {
        console.error('cluster worker %d died (%d)', worker.id, code);
        cluster.fork();
        console.info('restart worker.');
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
      // start worker
      require(worker)(opts, this.mnt);
    }
  }

  loadConfig() {
    const configPath = join(this.root, '/config/config');
    const pluginPath = join(this.root, '/config/plugin');
    return Object.assign({
      env: process.env.ENV || 'develop'
    },
      require(configPath),
      require(pluginPath)
    );
  }

  mountPlugins() {
    const pluginConfig = this.mnt.config.plugin;
    return pluginConfig && typeof pluginConfig === 'object' ?
      Object.keys(pluginConfig).filter(key => {
        // filter active plugins
        const plugin = pluginConfig[key];
        return (plugin.enable || plugin.enable === undefined) && (plugin.path || plugin.package)
      }).map(key => {
        // mount plugins
        const plugin = pluginConfig[key];
        if (plugin.path) {
          const tar = join(this.root, '/plugin/', plugin.path);
          return require(tar);
        }
        if (plugin.package) {
          return require(plugin.package);
        }
      }) : [];
  }

  mountMiddlewares() {
    const mwPath = join(this.root, '/app/middleware');
    const mwConfig = this.mnt.config.middleware;
    let middlewares = [];
    // static middleware
    if (this.mnt.config.plugin && this.mnt.config.plugin.static) {
      middlewares = middlewares.concat(mount('/public', serve(join(this.root, '/app/public'))));
    }
    // app/middleware/*
    const mws = mwConfig && typeof mwConfig === 'object' ?
      Object.keys(mwConfig).map((name) => {
        return {
          name: name,
          target: require(join(mwPath, name)),
          options: mwConfig[name]
        };
      }) : [];
    middlewares = middlewares.concat(mws);
    // router middleware
    const routerPath = join(this.root, '/app/router');
    const routers = fs.readdirSync(routerPath);
    let routeTo = {};
    routers
      .filter(r => r !== '_')
      .map(r => r.replace(/\.js$/g, ''))
      .forEach(r => {
        routeTo[r] = require(join(routerPath, r));
      });
    require(join(routerPath, '/_'))(router, routeTo);
    middlewares = middlewares.concat(router.routes(), router.allowedMethods({ throw: true }));

    return middlewares;
  }

  mountServices() {
    const servicePath = join(this.root, '/app/service');
    const services = fs.readdirSync(servicePath);
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
            app.context.service[serv] = require(join(servicePath, serv));
          }
        }
      }) : [];
  }

}

module.exports = new Lego;
