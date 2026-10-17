const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const certificateFile = process.env.WINDOWS_CERTIFICATE_FILE;
const certificatePassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;
const buildScript = process.argv[2] || 'make';

if (!['make', 'make:test', 'make:production'].includes(buildScript)) {
  console.error(`Lệnh build có chữ ký không hợp lệ: ${buildScript}`);
  process.exit(1);
}

if (!certificateFile) {
  console.error('Thiếu biến WINDOWS_CERTIFICATE_FILE trỏ tới chứng thư ký mã .pfx.');
  process.exit(1);
}

const resolvedCertificate = path.resolve(certificateFile);
if (!fs.existsSync(resolvedCertificate)) {
  console.error(`Không tìm thấy chứng thư ký mã: ${resolvedCertificate}`);
  process.exit(1);
}

if (!certificatePassword) {
  console.error('Thiếu biến WINDOWS_CERTIFICATE_PASSWORD.');
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', buildScript], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(`Không thể chạy quy trình build: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
