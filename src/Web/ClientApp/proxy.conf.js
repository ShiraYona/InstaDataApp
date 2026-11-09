// Proxy configuration for the Angular dev server.
// The backend port cannot be probed synchronously here, so it is resolved by
// the launcher (port-utils.js) and consumed from .ports.json / env vars.
const { readPortsFile } = require('./port-utils');

const resolved = readPortsFile();

const backendHttpsPort = Number(process.env.ASPNETCORE_HTTPS_PORT)
  || resolved.https
  || 5001;

const PROXY_CONFIG = [
  {
    context: ['/api', '/Identity', '/health'],
    target: `https://localhost:${backendHttpsPort}`,
    secure: false,
    headers: {
      Connection: 'Keep-Alive'
    }
  }
];

module.exports = PROXY_CONFIG;
