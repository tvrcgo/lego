
const BrowserSync = require('browser-sync');

module.exports = (agent, opts) => {

  agent.on('workers-ready', msg => {
    const startOpts = msg.options
    // start browser-sync on developing
    if (agent.mnt.config.env !== 'develop') {
      return
    }
    if (agent.bs) {
      return agent.bs.reload()
    }
    agent.bs = BrowserSync.create();
    agent.bs.init({
      proxy: 'localhost:' + (startOpts.port || 1024),
      ui: false,
      open: false,
      reloadDelay: 3000,
      files: [
        {
          match: [
            "app/view/**/*",
            "app/public/**/*",
            "app/component/**/*"
          ],
          fn: (evt, file) => {
            if (/(add|addDir)/.test(evt)) return
            console.log('[livereload::%s] %s', evt, file)
            agent.bs.reload()
          }
        },
        {
          match: [
            "app/agent/**/*.js",
            "app/middleware/**/*.js",
            "app/plugin/**/*.js",
            "app/router/**/*.js",
            "app/service/**/*.js",
            "config/*.js",
            "lego/**/*.js"
          ],
          fn: (evt, file) => {
            if (/(add|addDir)/.test(evt)) return
            console.log('[livereload::%s] %s', evt, file)
            agent.send({
              to: 'worker',
              cmd: 'worker-restart'
            })
          }
        }
      ]
    })
  })

  agent.ready()
}
