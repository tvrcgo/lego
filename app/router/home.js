'use strict';

exports.me = (ctx, next) => {
  ctx.service.db.get('me')
  ctx.render('index', {
    msg: 'it works'
  })
}

exports.she = (ctx, next) => {
  ctx.service.db.get('she')
  ctx.body = 'chou xiao bai'
}
