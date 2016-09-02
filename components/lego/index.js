'use strict'

const EventEmitter = require('events')
const fs = require('fs')
const join = require('path').join

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
    const wares = this.config[type] || {}
    return Object.keys(wares)
      .map(key => Object.assign({ key: key }, wares[key]))
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

  list(type) {
    const root = join(this.root, '/app/', type)
    if (!this.access(root)) {
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
    if (!this.access(configPath) || !this.access(mountPath)) {
      throw new Error('[lego] Missing config/config or config/mount')
      return
    }
    return Object.assign({
        env: process.env.ENV || configPath.env || 'develop'
      },
      require(configPath),
      require(mountPath)
    )
  }

  access(path) {
    try {
      fs.accessSync(path, fs.F_OK)
      return true
    } catch (e) {
      return false
    }
  }

  // send to parent
  send(msg) {
    process.send && process.send(msg)
  }

}

module.exports = Lego
