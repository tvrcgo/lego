'use strict'

const join = require('path').join
const fs = require('fs')
const CronJob = require('cron').CronJob
const Lego = require('../lego')

class Job extends Lego {

  constructor(argv) {
    super(argv)
  }

  start(opts) {
    const jobs = this.mount('job')
    const jobConfig = this.mnt.config.job
    jobs
      .filter(job => !!jobConfig[job.name])
      .forEach(job => {
        if (!job.target || typeof job.target !== 'function') {
          throw new Error('[job] Job <', job.name, '> exports must be function')
          return
        }
        try {
          const runner = job.target.call(this, this)
          return new CronJob(jobConfig[job.name].cron||'* * * * * *', runner, null, true)
        }
        catch(err) {
          console.error('[job] ERR:', err)
          this.emit('error', err)
        }
      })
    // notify master
    this.send({
      to: 'master',
      cmd: 'worker-start',
      mode: 'job',
      pid: process.pid
    })
    // restart job on command
    this.on('worker-restart', msg=> {
      process.exit(0)
    })
  }
}

module.exports = (opts) => {
  // start jobs
  const job = new Job
  job.start(opts)
  // exception
  process.on('uncaughtException', err => {
    console.error(err.errno, err.message)
    process.exit(0)
  })
  // exit
  process.once('SIGTERM', () => {
    console.warn('[job] Job exit with signal SIGTERM')
    process.exit(0)
  })
}
