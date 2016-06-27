'use strict'

const cluster = require('cluster')
const cp = require('child_process')
const os = require('os')
const join = require('path').join

const Lego = require('../lego')
const Messenger = require('./lib/messenger')
const debug = require('./lib/debug')('master')

const workerjs = join(__dirname, 'worker.js')
const agentjs = join(__dirname, 'agent.js')

class Master extends Lego {

  constructor(args) {
    super(args)
    this.workerCount = 0
  }

  start(opts) {
    opts = opts || {}
    this.options = opts
    if (cluster.isMaster) {
      debug.info('Start options: %s', JSON.stringify(opts))
      this.messenger = new Messenger(this)
      // start agent
      this.forkAgent(opts);
      this.on('agent-ready', this.onAgentReady.bind(this))
      this.on('worker-start', this.onWorkerStart.bind(this))
    }
    if (cluster.isWorker) {
      // start worker
      require(workerjs)(opts);
    }
  }

  forkAgent(opts) {
    this.agent = cp.fork(agentjs, [], {
      cwd: process.cwd()
    });
    // message: agent -> master
    this.agent.on('message', msg => {
      // agent -> master -> worker
      msg.from = 'agent'
      if (msg.to === 'worker') {
        return this.messenger.sendToWorker(msg)
      }
      this.emit(msg.cmd, msg)
    })
    // reboot agent on crashed.
    this.agent.on('exit', (code) => {
      debug.error('Agent exit (%d), reboot...', code)
      this.forkAgent();
    })
  }

  onAgentReady(msg) {
    debug.succ('Agent ready.')
    // already start workers.
    if (Object.keys(cluster.workers).length > 0) {
      return;
    }
    // start workers
    this.forkWorker();
    // reboot worker on crashed.
    cluster.on('exit', (worker, code) => {
      debug.error('Worker %d exit (%d), reboot...', worker.id, code)
      this.workerCount--;
      this.forkWorker({ count: 1 });
    });
  }

  forkWorker(opts) {
    opts = opts || {};
    const cpuCount = os.cpus().length;
    const workerCount = opts.count || cpuCount;
    for(let i=0; i<workerCount; i++) {
      const workerProc = cluster.fork();
      // message: worker -> master
      workerProc.on('message', msg => {
        // worker -> master -> agent
        msg.from = 'worker';
        if (msg.to === 'agent') {
          return this.messenger.sendToAgent(msg);
        }
        this.emit(msg.cmd, msg);
      })
    }
  }

  onWorkerStart(msg) {
    this.workerCount++
    if (this.workerCount === Object.keys(cluster.workers).length) {
      this.messenger.sendToAgent({
        to: 'agent',
        cmd: 'workers-ready',
        options: this.options
      })
      this.emit('workers-ready')
      debug.succ('Workers ready.')
    }

  }

}

module.exports = new Master;
