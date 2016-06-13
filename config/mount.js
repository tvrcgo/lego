
// 加载的插件
exports.plugin = {
  combo: {
    enable: false,
    path: 'lego-combo'
  },
  livereload: {
    enable: false,
    path: 'lego-livereload'
  },
  view: {
    path: 'lego-render',
    options: {
      ext: 'html'
    }
  },
  static: true
}

// 加载的中间件及配置
exports.middleware = {
  performance: {}
}

// 加载的agent
exports.agent = {
  livereload: {}
}
