// Helpers for choosing the dev-server / backend ports dynamically, so a second
// run (or a port already taken by another process) does not break the build.
const fs = require('fs');
const net = require('net');
const path = require('path');

const DEFAULT_HTTPS_PORT = 5001;
const DEFAULT_HTTP_PORT = 5000;
const PORTS_FILE = path.join(__dirname, '.ports.json');

/**
 * True when something is already listening on the port (i.e. the previous run
 * of the app is still alive). Locked DLL errors happen in exactly that state.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortListening(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const done = inUse => {
      socket.destroy();
      resolve(inUse);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Returns the first free port at or after `startPort`.
 * @param {number} startPort
 * @param {number} [maxTries]
 * @returns {Promise<number>}
 */
async function findFreePort(startPort, maxTries = 50) {
  for (let port = startPort; port < startPort + maxTries; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port found between ${startPort} and ${startPort + maxTries - 1}`);
}

/**
 * Resolves the backend URLs for this run.
 * ASPNETCORE_URLS (set by the .NET side) always wins; otherwise the first free
 * https/http pair is chosen.
 * @returns {Promise<{ https: number, http: number }>}
 */
async function resolveBackendPorts() {
  const urls = process.env.ASPNETCORE_URLS;
  if (urls) {
    const httpsUrl = urls.split(';').find(u => u.startsWith('https'));
    const httpUrl = urls.split(';').find(u => u.startsWith('http://'));
    return {
      https: httpsUrl ? Number(new URL(httpsUrl).port) : DEFAULT_HTTPS_PORT,
      http: httpUrl ? Number(new URL(httpUrl).port) : DEFAULT_HTTP_PORT,
    };
  }

  // Probe sequentially: both probing in parallel could pick the same number.
  const https = await findFreePort(DEFAULT_HTTPS_PORT);
  const http = await findFreePort(DEFAULT_HTTP_PORT);
  return { https, http };
}

/**
 * Persists the resolved ports for the synchronous Angular CLI config files.
 * @param {{ https: number, http: number }} ports
 */
function writePortsFile(ports) {
  fs.writeFileSync(PORTS_FILE, JSON.stringify(ports, null, 2));
}

/**
 * @returns {{ https?: number, http?: number }}
 */
function readPortsFile() {
  try {
    return JSON.parse(fs.readFileSync(PORTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = {
  DEFAULT_HTTPS_PORT,
  DEFAULT_HTTP_PORT,
  isPortListening,
  isPortFree,
  findFreePort,
  resolveBackendPorts,
  writePortsFile,
  readPortsFile,
};
