'use strict';

class DB {
  constructor() {

  }

  get(key) {
    console.log('service.db.get:', key);
  }
}

module.exports = new DB;
