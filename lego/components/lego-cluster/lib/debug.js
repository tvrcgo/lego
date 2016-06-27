'use strict';

const chalk = require('chalk')

const error = chalk.red
const warn = chalk.yellow
const info = chalk.blue
const succ = chalk.green
const log = chalk.gray

class Debug {

  constructor(src) {
    this.src = src
  }

  write(type, args) {
    const argv = [].slice.call(args)
    let msg = [
      '[%s] ' + argv[0],
      type ? type.call(null, this.src) : this.src
    ]
    msg = msg.concat(argv.slice(1))
    console.log.apply(null, msg)
  }

  log() {
    this.write(null, arguments)
  }

  succ() {
    this.write(chalk.green, arguments)
  }

  error() {
    this.write(chalk.red, arguments)
  }

  info() {
    this.write(chalk.blue, arguments)
  }
}

module.exports = (src) => {
  return new Debug(src)
}
