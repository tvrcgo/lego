'use strict';
const EventEmitter = require('events')
const fs = require('fs')
const join = require('path').join
const { access, isArray } = require('./lib/fn')

class Lego extends EventEmitter {

  constructor(argv) {
    super(argv)
    this.root = process.cwd()
    // message from child process
    process.on('message', (msg) => {
      this.emit('message', msg)
      if (msg.cmd) {
        this.emit(msg.cmd, msg)
      }
    })
  }

  mount(type) {
    const ENV = this.config.env
    const wares = this.config[type] || {}
    return Object.keys(wares)
      .map(key => Object.assign({ key: key }, wares[key]))
      .filter(ware => (isArray(ware.env) && ware.env.includes(ENV)) || ware.env === undefined)
      .filter(ware => (ware.enable || ware.enable === undefined))
      .map(ware => {
        const entryName = ware.path || ware.package || ware.key
        const entryPath = ware.package ? 'node_modules' : '/app/' + type
        const entry = require(join(this.root, entryPath, entryName))
        return {
          name: ware.key,
          entry: entry,
          options: ware
        }
      })
  }

  map(type) {
    const root = join(this.root, '/app/', type)
    if (!access(root)) {
      console.warn(`[lego] No app/${type} directory.`)
      return []
    }
    return fs.readdirSync(root)
      .map(item => item.replace(/\.js$/, ''))
      .map(item => ({
        name: item,
        entry: require(join(root, item))
      }))
  }

  get config() {
    const configPath = join(this.root, '/config/config.js')
    const mountPath = join(this.root, '/config/mount.js')

    const configInfo = access(configPath) ? require(configPath) : {}
    const mountInfo = access(mountPath) ? require(mountPath) : {}

    return Object.assign({
        env: process.env.NODE_ENV || configInfo.env || 'dev'
      },
      configInfo,
      mountInfo
    )
  }

  // send to parent
  send(msg) {
    process.send && process.send(msg)
  }

}

module.exports = Lego
