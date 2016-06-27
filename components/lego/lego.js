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

  mntConfig() {
    const configPath = join(this.root, '/config/config')
    const mountPath = join(this.root, '/config/mount')
    this.mnt.config = Object.assign({
      env: process.env.ENV || configPath.env || 'develop'
    },
      require(configPath),
      require(mountPath)
    )
  }

  // send to parent
  send(msg) {
    process.send && process.send(msg)
  }

}

module.exports = Lego
