/* eslint-disable yoda */
const {spawn} = require('child_process');
let spawnImplementation = spawn;

/**
 * @namespace CIKit
 */

/**
 * @typedef CIKit.Droplet.Port
 * @property {('tcp'|'udp')} type
 * @property {{ip: String, port: Number}} from
 */

/**
 * @typedef CIKit.Droplet
 * @property {String} id
 * @property {String} name
 * @property {String} created
 * @property {String} status
 * @property {Object<CIKit.Droplet.Port>} ports
 */

/**
 * @type {String[]}
 */
const dropletFreeCommands = ['add', 'list'];
/**
 * @type {String[]}
 */
const dropletCommands = ['start', 'stop', 'restart', 'delete'];
/**
 * @type {String[]}
 */
const allCommands = [...dropletFreeCommands, ...dropletCommands];
/**
 * @type {Object<Function>}
 */
const handlers = {
  /**
   * @param {String[]} list
   *   The list of lines to process.
   *
   * @return {CIKit.Droplet[]}
   *   The list of parsed droplets.
   */
  list(list) {
    return list.map(value => {
      let ports = {};
      // @example
      // @code
      // [
      //   '5b51632b9a30',
      //   'br0ken/ubuntu-systemd',
      //   '"/bin/bash -c \'exe..."',
      //   '2 months ago',
      //   'Up 13 days',
      //   '0.0.0.0:2201->22/tcp, 127.0.0.1:8001->80/tcp, 127.0.0.1:44301->443/tcp',
      //   'cikit01'
      // ]
      // @endcode
      value = value.split(/\s{2,}/);

      // In a case the "value" array will contain 6 items it means that
      // droplet is stopped.
      if (6 === value.length) {
        value[6] = value[5];
      }
      else {
        value[5].split(', ').forEach(entry => {
          // @example
          // @code
          // [
          //   '127.0.0.1:44301->443/tcp',
          //   '127.0.0.1:44301',
          //   '443',
          //   'tcp'
          // ]
          // @endcode
          entry = /(\d+\.\d+\.\d+\.\d+:\d+)->(\d+)\/(\w+)/.exec(entry);

          let from = entry[1].split(':');

          ports[entry[2]] = {
            type: entry[3],
            from: {
              ip: from[0],
              port: parseInt(from[1], 10),
            },
          };
        });
      }

      return {
        id: value[0],
        name: value[6],
        created: value[3],
        status: value[4],
        ports: ports,
      };
    });
  },
};

/**
 * @param {Function} [newSpawn]
 *   The function to spawn a process.
 */
function setSpawn(newSpawn) {
  spawnImplementation = newSpawn || spawn;
}

/**
 * @param {('add'|'list'|'start'|'stop'|'restart'|'delete')} command
 *   The name of the action.
 * @param {String} taskName
 *   The name of the Ansible task to parse the message of.
 * @param {String} [droplet]
 *   The name of a droplet to run an action for. Unused for "add" and "list".
 * @param {Boolean} [streamToStdout]
 *   The state of whether "cikit" stdout should be redirected to the process stdout.
 * @param {String} [hostname]
 *   The name of a host to run an action at.
 *
 * @return {Promise<String[]|Error>}
 *   The set of strings, printed to stdout by the "cikit".
 */
function cikit(command, taskName, droplet = undefined, streamToStdout = false, hostname = 'localhost') {
  if (!allCommands.includes(command)) {
    throw new Error(`The "${command}" command is not supported. Use one of "${allCommands.join('", "')}".`);
  }

  if (typeof taskName !== 'string' || taskName.length < 5) {
    throw new Error('The name of the Ansible task cannot be less than 5 characters.');
  }

  if (dropletFreeCommands.includes(command)) {
    // Ensure the droplet is unset.
    droplet = '';
  }
  else if (typeof droplet !== 'string' || droplet.length < 3) {
    throw new Error('The name of a droplet must be a string, longer than 3 characters.');
  }
  else {
    droplet = '=' + droplet;
  }

  return new Promise((resolve, reject) => {
    const {ANSIBLE_NOCOLOR, ANSIBLE_STDOUT_CALLBACK} = process.env;
    const restoreAnsibleEnv = () => {
      process.env.ANSIBLE_NOCOLOR = ANSIBLE_NOCOLOR;
      process.env.ANSIBLE_STDOUT_CALLBACK = ANSIBLE_STDOUT_CALLBACK;
    };

    process.env.ANSIBLE_NOCOLOR = 1;
    process.env.ANSIBLE_STDOUT_CALLBACK = 'default';

    const data = [];
    const proc = spawnImplementation('cikit', [
      'matrix/droplet',
      `--droplet-${command}${droplet}`,
      `--limit=${hostname}`,
    ]);

    let collect = false;
    let failed = false;

    proc.stdout.on('data', function dataListener(chunk) {
      // @todo This shitty-shit must be removed.
      for (let line of chunk.toString().split('\n')) {
        line = line.trim();

        if (line === '') {
          continue;
        }

        if (/^fatal:/.test(line)) {
          failed = true;
        }

        if (failed) {
          if (/^PLAY\s+RECAP/.test(line)) {
            proc.stdout.removeListener('data', dataListener);
            break;
          }

          data.push(line.replace(new RegExp(`^fatal:\\s+\\[${hostname}]:\\s+FAILED!\\s+=>\\s+`), ''));
        }
        else if (collect) {
          if (line === '}') {
            proc.stdout.removeListener('data', dataListener);
            break;
          }

          if (line !== `ok: [${hostname}] => {`) {
            line = line.replace(/^"msg":\s+[[{"]/, '').replace(/["}\]]$/, '');

            if (line !== '') {
              data.push(line.replace(/^"/, '').replace(/"(,)?$/, ''));
            }
          }
        }
        else if (line.match(new RegExp(`^TASK\\s+\\[droplet\\s+:\\s+${taskName}]`)) !== null) {
          collect = true;
        }
      }
    });

    if (streamToStdout) {
      proc.stdout.pipe(process.stdout);
    }

    proc.on('close', () => {
      restoreAnsibleEnv();

      if (failed) {
        const error = new Error();
        error.data = JSON.parse(data.join());

        resolve(error);
      }
      else {
        resolve(handlers[command] === undefined ? data : handlers[command](data));
      }
    });

    proc.on('error', (error) => {
      restoreAnsibleEnv();
      reject(error);
    });
  });
}

module.exports = {
  setSpawn,
  cikit,
};
