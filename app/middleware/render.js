
module.exports = function(opts) {
  return (ctx, next) => {
    const start = +new Date;
    next().then(() => {
      ctx.set('X-Duration', +new Date - start);
      ctx.body = 'hi, render works.';
    });
  }
};
