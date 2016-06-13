
const BrowserSync = require('browser-sync');

module.exports = (agent, opts) => {

  const bs = BrowserSync.create();
  bs.init({
    proxy: '127.0.0.1:1024'
  })

  setTimeout(() => {
    // restart worker
    agent.send({
      to: 'worker',
      cmd: 'worker-restart'
    })
  }, 3000)

  agent.on('message', msg => {
    console.log('[agent] livereload: on message', msg)
  })

  agent.ready()

}
