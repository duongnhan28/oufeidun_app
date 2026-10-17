const path = require('node:path');

const windowsIcon = path.resolve(__dirname, 'assets', 'app-icon.ico');
const certificateFile = process.env.WINDOWS_CERTIFICATE_FILE;
const certificatePassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;
const windowsSign = certificateFile
  ? {
      certificateFile: path.resolve(certificateFile),
      certificatePassword,
      description: 'Oufeidun - Quản lý bán hàng kính cường lực',
      timestampServer:
        process.env.WINDOWS_TIMESTAMP_SERVER || 'http://timestamp.digicert.com'
    }
  : undefined;

module.exports = {
  packagerConfig: {
    asar: true,
    icon: windowsIcon,
    ...(windowsSign ? { windowsSign } : {}),
    ignore: [
      /^\/?(src|tests|supabase|server|scripts|docs|deployment|test-results|playwright-report|out|BAN-GIAO|\.local)(\/|$)/,
      /^\/?\.(git|github)(\/|$)/,
      /^\/?[^/]+\.cmd$/,
      /^\/?[^/]+\.(md|code-workspace)$/,
      /\.env/,
      /AGENTS\.md/,
      /README\.md/,
      /BA-SPEC\.md/,
      /FEATURE-CHECKLIST\.md/,
      /LOCAL-SERVER-IMPLEMENTATION\.md/,
      /LOCAL-UPDATE-PLAN\.md/,
      /LOCAL-DATA-MIGRATION\.md/,
      /LAN-DISCOVERY-PLAN\.md/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'KinhBanHang',
        title: 'Oufeidun',
        setupExe: 'Oufeidun-Setup.exe',
        setupIcon: windowsIcon,
        ...(windowsSign ? { windowsSign } : {})
      }
    },
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'win32'] }
  ]
};
