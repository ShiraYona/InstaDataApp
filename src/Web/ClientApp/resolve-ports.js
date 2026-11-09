// Runs before the dev server: publishes the backend ports the .NET side is
// listening on (ASPNETCORE_URLS), or picks the next free pair when the dev
// server was started on its own. proxy.conf.js reads the saved file.
const { resolveBackendPorts, writePortsFile } = require('./port-utils');

resolveBackendPorts()
  .then(ports => {
    writePortsFile(ports);
    console.log(`Backend: https://localhost:${ports.https}, http://localhost:${ports.http}`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
