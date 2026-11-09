// Entry point of the Angular dev server (called by `npm start`, which the .NET
// SPA proxy launches on every run).
//
// Every run must survive the previous one still being alive, so the dev server
// port is chosen dynamically instead of being hard-coded.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findFreePort } = require('./port-utils');

const DEFAULT_DEV_PORT = 44447;
const APP_NAME = process.env.npm_package_name || 'InstaDataApp.Web';

async function main() {
  // The .NET SPA proxy found the default port free, so it will open the browser
  // there; probe it again right before binding to avoid a race.
  const devPort = await findFreePort(DEFAULT_DEV_PORT);
  if (devPort !== DEFAULT_DEV_PORT) {
    console.warn(`Port ${DEFAULT_DEV_PORT} is in use, starting the dev server on ${devPort} instead.`);
  }

  startAngularDevServer(devPort);
}

/**
 * @param {number} devPort
 */
function startAngularDevServer(devPort) {
  // npm scripts run through cmd.exe, which breaks on paths containing spaces or
  // Hebrew characters, so spawn node directly with an argument array.
  const certDir = path.join(
    process.env.APPDATA || path.join(process.env.HOME, '.aspnet'),
    'ASP.NET',
    'https'
  );
  const ngBin = path.join(__dirname, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

  const args = [ngBin, 'serve', '--port', String(devPort)];
  const pem = path.join(certDir, `${APP_NAME}.pem`);
  const key = path.join(certDir, `${APP_NAME}.key`);
  if (fs.existsSync(pem) && fs.existsSync(key)) {
    args.push('--ssl', '--ssl-cert', pem, '--ssl-key', key);
  }

  const child = spawn(process.execPath, args, { stdio: 'inherit', cwd: __dirname });
  child.on('exit', code => process.exit(code ?? 0));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
