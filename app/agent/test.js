
module.exports = (agent) => {

  agent.on('message', msg => {
    console.log('[agent::test]', msg)
  })

  agent.ready()

}
