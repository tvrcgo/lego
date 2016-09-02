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
      return
    }
    // all agents are ready
    this.send({
      to: 'master',
      cmd: 'agent-ready'
    })
  }
}

const agent = new Agent

if (agent.agents.length) {
  agent.agents.map(item => {
    item.entry.call(null, agent, item.options)
  })
}
else {
  // no agent
  agent.ready()
}

// exit
process.once('SIGTERM', () => {
  console.warn('[agent] Agent exit with signal SIGTERM')
  process.exit(0)
})
