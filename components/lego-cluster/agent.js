'use strict';

const join = require('path').join
const fs = require('fs')

const Lego = require('../lego')

class Agent extends Lego {

  constructor(args) {
    super(args)
    this.mntAgents()
    this.readyNum = 0
  }

  mntAgents() {
    const agentRoot = join(this.root, '/app/agent')
    if (!this.access(agentRoot)) {
      this.mnt.agents = []
      return
    }
    // app/agent/*
    const agentConfig = this.mnt.config.agent || {}
    this.mnt.agents = Object.keys(agentConfig)
      .filter(name => {
        const conf = agentConfig[name]
        return (conf.enable || conf.enable === undefined) && (conf.package || conf.path)
      })
      .map(name => {
        const conf = agentConfig[name]
        const entry = conf.package ?
          require(join(this.root, 'node_modules', conf.package)) : require(join(agentRoot, name))
        return {
          name: name,
          entry: entry,
          options: conf
        }
      })
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
    item.entry.call(this, agent, item.options)
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
