'use strict';

const EventEmitter = require('events');
const cluster = require('cluster');
const os = require('os');
const path = require('path');
const fs = require('fs');
const koa = require('koa');
const serve = require('koa-static');
const mount = require('koa-mount');

const worker = path.join(__dirname, 'worker.js');

class Lego extends EventEmitter {

  constructor() {
    super()
    this.ctx = {};
    this.root = this.ctx.root = process.cwd();
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
      this.ctx.config = this.loadConfig();
      // mount middlewares
      this.ctx.middlewares = this.mountMiddlewares();
      // mount services
      this.ctx.services = this.mountServices();
      // start worker
      require(worker)(opts, this.ctx);
    }
  }

  loadConfig() {
    const configPath = path.join(this.root, '/config/config');
    const pluginPath = path.join(this.root, '/config/plugin');
    return Object.assign({
      env: process.env.ENV || 'develop'
    },
      require(configPath),
      require(pluginPath)
    );
  }

  mountMiddlewares() {
    // app/middleware/*
    const mwPath = path.join(this.root, '/app/middleware');
    const mwConfig = this.ctx.config.middleware;
    let middlewares = mwConfig && typeof mwConfig === 'object' ?
      Object.keys(mwConfig).map((name) => require(path.join(mwPath, name))(mwConfig[name])) : [];
    // static middleware
    if (this.ctx.config.plugin && this.ctx.config.plugin.static) {
      console.log('static enable.');
      middlewares.push(mount('/public', serve(path.join(this.root, '/app/public'))));
    }
    // router middleware

    return middlewares;
  }

  mountServices() {
    const servicePath = path.join(this.root, '/app/service');
    const services = fs.readdirSync(servicePath);
    return services ?
      services.map((serv) => {
        serv = serv.replace(/\.js$/, '');
        return {
          name: serv,
          target: require(path.join(servicePath, serv))
        };
      }) : [];
  }

}

module.exports = new Lego;
