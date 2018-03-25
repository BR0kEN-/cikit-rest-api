/**
 * @type {nconf.Provider}
 */
const nconf = require('nconf');

nconf
  .argv()
  .env()
  .file('./config.json');

module.exports = nconf;
