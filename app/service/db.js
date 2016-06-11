'use strict';

class DB {
  constructor() {

  }

  get(key) {
    console.log('db get:', key);
  }
}

module.exports = new DB;
