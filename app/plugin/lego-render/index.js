
const swig = require('swig');
const path = require('path');

function render(opts) {

  const ext = opts.ext || 'tpl';

  swig.setDefaults({
    cache: opts.cache
  });

  return function(view, locals) {
    // join extension
    if (path.extname(view) == "") {
      view = view + '.' + ext;
    }
    // resolve tpl path
    const tpl = path.resolve((opts.root || 'views'), view);
    // render tpl
    this.body = swig.renderFile(tpl, locals);
  }
}

function extend(opts, mnt, app) {
  // extend ctx.render
  app.context.render = render({
    root: path.join(process.cwd(), 'app/view'),
    ext: opts.ext || 'html',
    cache: mnt.config.env === 'develop' ? false : 'memory'
  })
}

module.exports = extend
