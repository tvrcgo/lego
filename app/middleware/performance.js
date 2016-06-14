
module.exports = function(opts) {
  return (ctx, next) => {
    const start = +new Date;
    next().then(() => {
      console.log(ctx.method, ctx.request.href, ctx.status);
      if (ctx.status === 404) {
        return ctx.throw(404);
      }
      ctx.set('X-Duration', +new Date - start);
    }).catch(err => {
      console.error(err, ctx.status, ctx.request.href);
    });
  }
};
