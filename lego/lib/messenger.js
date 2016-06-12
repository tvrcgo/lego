'use strict';

const cluster = require('cluster');

class Messenger {

  constructor(master) {
    this.master = master;
    process.on('message', msg => {
      msg.from = 'parent';
      this.dispatch(msg);
    })
  }

  dispatch(msg) {
    if (!msg.from) {
      msg.from = 'master';
    }

    if (msg.to === 'master') {
      this.sendToMaster(msg);
      return;
    }

    if (msg.from === 'parent') {
      this.sendToMaster(msg);
    }

    if (msg.to === 'worker' || msg.from === 'agent') {
      this.sendToWorker(msg);
      return;
    }

    if (msg.to === 'agent' || msg.from === 'app') {
      this.sendToAgent(msg);
      return;
    }
  }

  sendToMaster(msg) {
    this.master.emit(msg.action, msg.data);
  }

  sendToParent(msg) {
    process.send && process.send(msg);
  }

  sendToWorker(msg) {
    for (let id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker.state === 'disconnected') {
        continue;
      }
      if (msg.toPid && msg.toPid !== String(worker.process.pid)) {
        continue;
      }
      sendmessage(worker, msg);
    }
  }

  sendToAgent(msg) {
    if (this.master.agent) {
      sendmessage(this.master.agent, msg);
    }
  }
}

function sendmessage(child, msg) {
  if (typeof child.send !== 'function') {
    // not a child process
    return setImmediate(child.emit.bind(child, 'message', msg));
  }
  const connected = child.process ? child.process.connected : child.connected;
  if (connected) {
    return child.send(message);
  }
}

module.exports = Messenger;
