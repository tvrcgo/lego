'use strict';

module.exports = (mnt, app) => {
  return (ctx, next) => {
    console.log('[plugin] combo');
    next();
  }
}
