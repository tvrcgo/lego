'use strict';

exports.me = (ctx, next) => {
  ctx.body = 'it works';
}

exports.she = (ctx, next) => {
  ctx.body = 'chou xiao bai';
}
