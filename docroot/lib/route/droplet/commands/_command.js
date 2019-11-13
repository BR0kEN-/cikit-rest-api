const {cikit} = require('../../../utils/cikit');

module.exports = (app, command, handler) => async (request, response) => {
  const callback = handler(request, response);
  const result = await cikit(command, request.params.taskName, request.params.droplet, app.isDev);

  if (result instanceof Error) {
    throw new app.errors.RuntimeError(result.data.stderr, 400, 'ansible_command_failed');
  }

  return callback(result);
};
