'use strict';

const cluster = require('cluster')
const cp = require('child_process')
const os = require('os')
const join = require('path').join

const Lego = require('../lego')
const Messenger = require('./lib/messenger')
const debug = require('./lib/debug')('master')

const workerApp = join(__dirname, 'worker.js')
const agentApp = join(__dirname, 'agent.js')

class Master extends Lego {

  constructor(args) {
    super(args)
    this.running = 0
  }

  start(opts = {}) {
    this.options = opts
    if (cluster.isMaster) {
      debug.info('Start options: %s', JSON.stringify(opts))
      this.messenger = new Messenger(this)
      // start agent
      this.forkAgent()
      this.on('agents-ready', this.onAgentReady.bind(this))
      this.on('worker-start', this.onWorkerStart.bind(this))
    }
    if (cluster.isWorker) {
      // start worker
      require(workerApp)(opts)
    }
  }

  forkAgent() {
    this.agent = cp.fork(agentApp, [], {
      cwd: process.cwd()
    })
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
      this.forkAgent()
    })
  }

  onAgentReady() {
    debug.succ('Agent ready.')
    // already start workers.
    if (this.running > 0) {
      return
    }
    // start workers
    this.forkWorker()
    // reboot worker on crashed.
    cluster.on('exit', (worker, code) => {
      this.running--
      debug.error('Worker %d exit (%d), reboot...', worker.id, code)
      this.forkWorker({ count: 1 })
    })
  }

  forkWorker(opts = {}) {
    const limit = opts.count || os.cpus().length
    for(let i=0; i<limit; i++) {
      const workerProc = cluster.fork()
      // message: worker -> master
      workerProc.on('message', msg => {
        // worker -> master -> agent
        msg.from = 'worker'
        if (msg.to === 'agent') {
          return this.messenger.sendToAgent(msg)
        }
        this.emit(msg.cmd, msg)
      })
    }
  }

  onWorkerStart(msg) {
    this.running++
    const limit = this.options.count || os.cpus().length
    if (this.running === limit) {
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

module.exports = new Master
