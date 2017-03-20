'use strict'
const join = require('path').join
const fs = require('fs')
const Lego = require('../lego')

class Agent extends Lego {

  constructor(args) {
    super(args)
    this.agents = this.mount('agent')
    this.readyNum = 0
  }

  ready() {
    this.readyNum++
    if (this.readyNum < this.agents.length) {
      // agent ready
      this.send({
        to: 'master',
        cmd: 'agent-ready'
      })
      return
    }
    // all agents are ready
    this.send({
      to: 'master',
      cmd: 'agents-ready'
    })
  }
}

const app = new Agent()

if (app.agents.length) {
  app.agents.map(agent => {
    agent.entry.call(null, agent.options, app)
  })
}
else {
  // no agent
  app.ready()
}

// exit
process.once('SIGTERM', () => {
  console.warn('[agent] Agent exit with signal SIGTERM')
  process.exit(0)
})
