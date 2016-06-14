'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const join = require('path').join;
const serve = require('koa-static');
const mount = require('koa-mount');
const router = require('koa-router')();

class Lego extends EventEmitter {

  constructor(argv) {
    super(argv)
    this.mnt = {}
    this.root = process.cwd()
    process.on('message', (msg) => {
      this.emit('message', msg)
      if (msg.cmd) {
        this.emit(msg.cmd, msg)
      }
    })
  }

  mount() {
    this.mnt.config = this.mntConfig();
    this.mnt.agents = this.mntAgents();
    this.mnt.plugins = this.mntPlugins();
    this.mnt.services = this.mntServices();
    this.mnt.middlewares = this.mntMiddlewares();
    this.mnt.routers = this.mntRouters();
    return this.mnt;
  }

  mntConfig() {
    const configPath = join(this.root, '/config/config');
    const mountPath = join(this.root, '/config/mount');
    return Object.assign({
      env: process.env.ENV || configPath.env || 'develop'
    },
      require(configPath),
      require(mountPath)
    );
  }

  mntAgents() {
    const agentRoot = join(this.root, '/app/agent')
    if (!access(agentRoot)) {
      console.warn('no agent directory.')
      return [];
    }
    // app/agent/*
    const agentConfig = this.mnt.config.agent
    return Object.keys(agentConfig).map(name => {
      return {
        name: name,
        target: require(join(agentRoot, name)),
        options: agentConfig[name]
      }
    })
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
        return ret;
      }) : [];
    // static assets
    if (pluginConfig.static) {
      plugins.push(mount('/public', serve(join(this.root, '/app/public'))));
    }
    return plugins;
  }

  mntMiddlewares() {
    const mwRoot = join(this.root, '/app/middleware');
    if (!access(mwRoot)) {
      console.warn('no middleware directory.');
      return [];
    }
    // app/middleware/*
    const mwConfig = this.mnt.config.middleware;
    return mwConfig && typeof mwConfig === 'object' ?
      Object.keys(mwConfig).map((name) => {
        return {
          name: name,
          target: require(join(mwRoot, name)),
          options: mwConfig[name]
        };
      }) : [];
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
    return [router.routes(), router.allowedMethods({ throw: true })];
  }

  mntServices() {
    const serviceRoot = join(this.root, '/app/service');
    if (!access(serviceRoot)) {
      console.warn('no service directory.');
      return [];
    }
    // app/service/*
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

  send(msg) {
    process.send && process.send(msg);
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

module.exports = Lego
