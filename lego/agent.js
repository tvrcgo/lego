'use strict';

const path = require('path');
const root = process.cwd();

const agent = require(path.join(root, '/app/agent'));

// sendmsg: agent -> master
process.send({
  to: 'master',
  action: 'agent-start'
});

// exit
process.once('SIGTERM', () => {
  console.warn('[worker] worker exit with signal SIGTERM');
  process.exit(0);
});
