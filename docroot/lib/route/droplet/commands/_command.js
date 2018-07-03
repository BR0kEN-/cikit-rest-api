const {execSync} = require('child_process');
const jsonpath = require('jsonpath');
const hostname = 'localhost';

module.exports = (app, command, handler) => async (request, response) => {
  const callback = handler(request, response);
  const script = `ANSIBLE_STDOUT_CALLBACK=json cikit matrix/droplet --droplet-${command}${request.params.droplet ? '=' + request.params.droplet : ''} --limit=${hostname}`;
  const parse = (data, query) => {
    const jsonPath = `$.plays[0].tasks[${query}].hosts.${hostname}`;

    app.log.debug('Applying JSON path query "%s"', jsonPath);

    return jsonpath.query(JSON.parse(data), jsonPath)[0];
  };

  try {
    app.log.debug('Running "%s"', script);

    return callback(parse(await execSync(script), `?(@.task.name == 'droplet : ${request.params.taskName}')`));
  }
  catch (error) {
    throw new app.errors.RuntimeError(parse(error.stdout, '-1:').stderr, 400, 'ansible_command_failed');
  }
};
