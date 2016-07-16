'use strict';

const EventEmitter = require('events')
const fs = require('fs')
const join = require('path').join

class Lego extends EventEmitter {

  constructor(argv) {
    super(argv)
    this.mnt = {}
    this.root = process.cwd()
    // message from child process
    process.on('message', (msg) => {
      this.emit('message', msg)
      if (msg.cmd) {
        this.emit(msg.cmd, msg)
      }
    })
    // mount config
    this.mntConfig()
  }

  mount(type) {
    const root = join(this.root, '/app/', type)
    if (!this.access(root)) {
      console.warn('[lego] mount: No <', type, '> assets')
      return []
    }
    const entries = fs.readdirSync(root)
    return entries ?
      entries.map(name => {
        name = name.replace(/\.js$/, '')
        const entry = require(join(root, name))
        return {
          name: name,
          entry: entry
        }
      }) : []
  }

  mntConfig() {
    const configPath = join(this.root, '/config/config.js')
    const mountPath = join(this.root, '/config/mount.js')
    if (!this.access(configPath) || !this.access(mountPath)) {
      throw new Error('[lego] Missing config/config or config/mount')
      return
    }
    this.mnt.config = Object.assign({
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
