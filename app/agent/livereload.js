
module.exports = (agent, opts) => {

  agent.on('message', msg => {
    console.log('[agent] livereload: on message', msg)
  })

  agent.ready()

}
