'use strict';

module.exports = (ctx, next) => {
  console.log('[plugin] combo');
  next();
}
