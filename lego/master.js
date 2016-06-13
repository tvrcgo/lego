'use strict';

const cluster = require('cluster');
const cp = require('child_process');
const os = require('os');
const join = require('path').join;

const Lego = require('./lego');
const Messenger = require('./lib/messenger');

const workerjs = join(__dirname, 'worker.js');
const agentjs = join(__dirname, 'agent.js');

class Master extends Lego {

  constructor(args) {
    super(args)
  }

  start(opts) {
    opts = opts || {};
    this.mnt.options = opts;
    if (cluster.isMaster) {
      this.messenger = new Messenger(this);
      // start agent
      this.forkAgent();
      this.on('agent-ready', this.onAgentReady.bind(this))
      this.on('worker-start', this.onWorkerStart.bind(this))
    }
    if (cluster.isWorker) {
      // start worker
      require(workerjs)(opts);
    }
  }

  forkAgent() {
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
      console.warn('[master] Agent exit (%d), reboot...', code);
      this.forkAgent();
    })
  }

  onAgentReady(msg) {
    msg.agentName &&
    console.log('[master] Agent [%s] ready.', msg.agentName);
    // already start workers.
    if (Object.keys(cluster.workers).length > 0) {
      return;
    }
    // start workers
    this.forkWorker();
    // reboot worker on crashed.
    cluster.on('exit', (worker, code) => {
      console.error('[master] cluster worker %d died (%d), reboot...', worker.id, code);
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
    console.log('[master] Worker start. Port:%d, Pid:%d', msg.port, msg.pid)
  }

}

module.exports = new Master;
