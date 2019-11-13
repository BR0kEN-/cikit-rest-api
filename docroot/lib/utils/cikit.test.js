const {readFileSync} = require('fs');
const {expect} = require('chai');
// eslint-disable-next-line node/no-unpublished-require
const mockSpawn = require('mock-spawn');

const {cikit, setSpawn} = require('./cikit');
const directory = `${__dirname}/__fixtures__`;

describe('cikit', () => {
  const mySpawn = mockSpawn();

  before(() => {
    setSpawn(mySpawn);
  });

  after(() => {
    setSpawn();
  });

  it('arguments', () => {
    expect(() => cikit('bla')).to.throw(Error, 'The "bla" command is not supported. Use one of "add", "list", "start", "stop", "restart", "delete".');
    expect(() => cikit('stop')).to.throw(Error, 'The name of the Ansible task cannot be less than 5 characters.');
    expect(() => cikit('stop', 'Stop the "cikit23" droplet')).to.throw(Error, 'The name of a droplet must be a string, longer than 3 characters.');
    expect(() => cikit('stop', 'Stop the "cikit23" droplet', 'ci')).to.throw(Error, 'The name of a droplet must be a string, longer than 3 characters.');
    expect(() => cikit('stop', 'Stop the "cikit23" droplet', false)).to.throw(Error, 'The name of a droplet must be a string, longer than 3 characters.');
  });

  it('list (empty)', async () => {
    mySpawn.sequence.add(mySpawn.simple(0, readFileSync(`${directory}/list-empty.txt`)));
    const result = await cikit('list', 'Store the list of all droplets');

    expect(result).to.be.an('array');
    expect(result).to.have.length(0);
  });

  it('list', async () => {
    mySpawn.sequence.add(mySpawn.simple(0, readFileSync(`${directory}/list-full.txt`)));
    const result = await cikit('list', 'Store the list of all droplets', undefined, true);

    expect(result).to.be.an('array');
    expect(result).to.have.length(22);
    expect(result[0].name).to.equal('cikit22');
    expect(result[21].name).to.equal('cikit01');
  });

  it('add (multiline)', async () => {
    mySpawn.sequence.add(mySpawn.simple(0, readFileSync(`${directory}/add-multiline.txt`)));
    const result = await cikit('add', 'Print the name of newly created droplet');

    expect(result).to.be.an('array');
    expect(result).to.have.length(2);
    expect(result).to.eql(['Test line 1', 'Test line 2']);
  });

  it('add', async () => {
    mySpawn.sequence.add(mySpawn.simple(0, readFileSync(`${directory}/add.txt`)));
    const result = await cikit('add', 'Print the name of newly created droplet');

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.equal("The 'cikit23' just has been created.");
  });

  it('add (error)', async () => {
    mySpawn.sequence.add(function (callback) {
      this.emit('error', new Error('spawn ENOENT'));

      return callback(8);
    });

    try {
      expect(await cikit('add', 'Print the name of newly created droplet')).to.throw();
    }
    catch (error) {
      expect(error.message).to.equal('spawn ENOENT');
    }
  });

  it('stop (error)', async () => {
    mySpawn.sequence.add(mySpawn.simple(1, readFileSync(`${directory}/stop-error.txt`)));
    const result = await cikit('stop', 'Stop the "bla" droplet', 'bla');

    expect(result).to.be.instanceOf(Error);
    expect(result.data.cmd).to.equal('docker stop bla');
    expect(result.data.msg).to.equal('non-zero return code');
    expect(result.data.stderr).to.equal('Error response from daemon: No such container: bla');
  });
});
