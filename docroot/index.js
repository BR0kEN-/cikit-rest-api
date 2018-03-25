process.title = module.filename.split('/').slice(-2)[0];

const app = require('./lib/app');
const server = app.listen(app.port, () => app.log.info('Listening on port ' + app.port));

process.on('SIGINT', () => server.close(process.exit));
