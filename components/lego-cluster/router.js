const router = require('koa-router')()
const debug = require('./lib/debug')('router')
const Lego = require('../lego')

class Router extends Lego {
  constructor(argv) {
    super(argv)
  }

  get routes() {
    const routers = this.map('router')
    let routes
    let entries = {}
    routers.map(r => {
      if (r.name === '_') {
        routes = r.entry
      } else {
        entries[r.name] = r.entry
      }
    })
    if (routes) {
      // invoke router
      routes.call(null, router, entries)
      // use router middleware
      return [router.routes(), router.allowedMethods({ throw: true })]
    }
    return []
  }
}

module.exports = new Router