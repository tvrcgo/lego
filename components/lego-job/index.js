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
    jobs.map(job => {
      try {
        const runner = job.entry.call(this, this, job.options)
        return new CronJob(job.options.cron||'* * * * * *', runner, null, true)
      } catch (e) {
        console.error('[lego] ERRJOB:', err)
        this.emit('error', err)
      }
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
    console.warn('[lego] Job exit with signal SIGTERM')
    process.exit(0)
  })
}