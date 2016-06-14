'use strict';

const path = require('path')
const fs = require('fs')

const Lego = require('./lego');

class Agent extends Lego {

  constructor(args) {
    super(args)
    this.mount();
    this.readyNum = 0;
  }

  ready() {
    this.readyNum++;
    if (this.readyNum < this.mnt.agents.length) {
      return;
    }
    // all agents are ready
    this.send({
      to: 'master',
      cmd: 'agent-ready'
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
  // no agent
  agent.ready()
}

// exit
process.once('SIGTERM', () => {
  console.warn('[agent] Agent exit with signal SIGTERM')
  process.exit(0)
})
