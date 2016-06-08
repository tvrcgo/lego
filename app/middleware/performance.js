
module.exports = function(opts) {
  return (ctx, next) => {
    const start = +new Date;
    next().then(done => {
      ctx.set('X-Duration', +new Date - start);
    });
  }
};
