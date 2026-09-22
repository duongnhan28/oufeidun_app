const path = require('node:path');

const windowsIcon = path.resolve(__dirname, 'assets', 'app-icon.ico');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: windowsIcon,
    ignore: [/^\/?(src|tests|supabase|docs|test-results|playwright-report|out|BAN-GIAO|\.local)(\/|$)/, /\.env/, /BA-SPEC\.md/]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'KinhBanHang',
        title: 'Oufeidun',
        setupExe: 'Oufeidun-Setup.exe',
        setupIcon: windowsIcon
      }
    },
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'win32'] }
  ]
};
