process.title = module.filename.split('/').slice(-2)[0];

const {Server} = require('spdy');
const fs = require('fs');
const app = require('./lib/app');
const options = {
  key: fs.readFileSync('/etc/ssl/private/ssl.key'),
  cert: fs.readFileSync('/etc/ssl/private/ssl.crt'),
  dhparam: fs.readFileSync('/etc/ssl/private/dhparam.pem'),
  spdy: {
    protocols: ['h2', 'spdy/3.1', 'http/1.1'],
    plain: false,
  },
};

const server = Server
  .create(options, app)
  .setTimeout(5 * 60 * 1000)
  .setKeepAlive(true)
  .listen(app.config.get('port'), app.config.get('host'));

process.on('SIGINT', () => server.close(process.exit));
