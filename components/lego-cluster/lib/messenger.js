'use strict'

const cluster = require('cluster')

class Messenger {

  constructor(master) {
    this.master = master
  }

  sendToMaster(msg) {
    this.master.emit(msg.cmd, msg.data)
  }

  sendToParent(msg) {
    process.send && process.send(msg)
  }

  sendToWorker(msg) {
    for (let id in cluster.workers) {
      const worker = cluster.workers[id]
      if (worker.state === 'disconnected') {
        continue
      }
      // specify target process pid
      if (msg.pid && msg.pid !== String(worker.process.pid)) {
        continue
      }
      this.send(worker, msg)
    }
  }

  sendToAgent(msg) {
    if (this.master.agent) {
      this.send(this.master.agent, msg)
    }
  }

  send(child, msg) {
    // not a child process
    if (typeof child.send !== 'function') {
      return setImmediate(child.emit.bind(child, 'message', msg))
    }
    const connected = child.process ? child.process.connected : child.connected
    if (connected) {
      return child.send(msg)
    }
  }
}

module.exports = Messenger
