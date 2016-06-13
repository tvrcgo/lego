'use strict';

const path = require('path')
const fs = require('fs')

const Lego = require('./lego');

class Agent extends Lego {

  constructor(args) {
    super(args)
    this.mount();
  }

  ready() {
    this.send({
      to: 'master',
      cmd: 'agent-ready',
      agentName: this.agentName
    })
  }

}

const agent = new Agent

if (agent.mnt.agents.length) {
  agent.mnt.agents.forEach(item => {
    agent.agentName = item.name
    item.target.call(this, agent, item.options)
  })
}
else {
  // no agent.
  agent.ready()
}

// exit
process.once('SIGTERM', () => {
  console.warn('[agent] Agent exit with signal SIGTERM')
  process.exit(0)
})
