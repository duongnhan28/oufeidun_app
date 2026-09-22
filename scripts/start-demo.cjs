// Launch the desktop application and leave its window running after this script exits.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!fs.existsSync(path.join(root, 'dist/index.html'))) {
  console.error('Chưa có bản build. Chạy npm.cmd run start để build và mở ứng dụng.');
  process.exit(1);
}
const env = { ...process.env };
// Electron's Node-only mode is a development environment setting, not an app mode.
delete env.ELECTRON_RUN_AS_NODE;
delete env.APP_TEST_DATA;
const logs = path.join(root, '.local');
fs.mkdirSync(logs, { recursive: true });
const output = fs.openSync(path.join(logs, 'desktop.log'), 'a');
const child = spawn(require('electron'), [root], {
  cwd: root, env, detached: true, stdio: ['ignore', output, output],
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('spawn', () => {
  console.log(`Đã mở ứng dụng desktop. PID: ${child.pid}`);
  child.unref();
  fs.closeSync(output);
});
