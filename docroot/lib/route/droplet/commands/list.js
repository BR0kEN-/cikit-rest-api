const Cache = require('sync-disk-cache');
const cache = new Cache('droplet');
const command = require('./_command');

module.exports = (app, useCache = false) => command(app, 'list', (request, response) => {
  request.params.taskName = 'Store the list of all droplets';

  // Cache is used only if exist and "list" resource has been queried explicitly.
  if (useCache && cache.has('list')) {
    throw new app.errors.ResponseError(JSON.parse(cache.get('list').value));
  }

  return (result) => {
    cache.set('list', JSON.stringify(result));

    return response.json(result);
  };
});
