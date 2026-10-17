import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const endpoint = 'https://oufeidun.vn/api/glass-lookup'
function parse(text: string) {
  return Object.fromEntries(text.split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => {
    const split = line.indexOf('=')
    return [line.slice(0, split).trim(), line.slice(split + 1).trim()]
  }))
}

test('customer LOCAL lookup uses hosting while business API stays separate', () => {
  const profile = parse(readFileSync(resolve('.env.local-mysql.example'), 'utf8'))
  assert.equal(profile.VITE_SERVER_ENV, 'local')
  assert.equal(profile.VITE_DATA_BACKEND, 'api')
  assert.equal(profile.VITE_API_BASE_URL, 'http://127.0.0.1:8787/api/app/v1')
  assert.equal(profile.VITE_GLASS_LOOKUP_API_URL, endpoint)
  assert.ok(readFileSync(resolve('scripts/build-local-client.ps1'), 'utf8').includes(`$LookupUrl='${endpoint}'`))
  assert.equal(new URL('/api/images/123?v=20260921', endpoint).origin, 'https://oufeidun.vn')
})

test('customer runtime config preserves LAN API, uses new lookup and excludes server secrets', () => {
  mkdirSync(resolve('.local'), { recursive: true })
  const fixture = mkdtempSync(resolve('.local', 'customer-lookup-config-'))
  mkdirSync(join(fixture, 'scripts'))
  copyFileSync(resolve('scripts/write-runtime-config.cjs'), join(fixture, 'scripts/write-runtime-config.cjs'))
  writeFileSync(join(fixture, '.env.local-mysql.local'), [
    'VITE_SERVER_ENV=local', 'VITE_DEMO_MODE=false', 'VITE_DATA_BACKEND=api',
    'VITE_API_BASE_URL=https://shop.example.test/api/app/v1', `VITE_GLASS_LOOKUP_API_URL=${endpoint}`,
    'MYSQL_PASSWORD=fixture-do-not-export', 'SMTP_PASS=fixture-do-not-export',
  ].join('\n'))
  const isolatedEnvironment = { ...process.env }
  for (const key of Object.keys(isolatedEnvironment)) if (key.startsWith('VITE_')) delete isolatedEnvironment[key]
  const result = spawnSync(process.execPath, [join(fixture, 'scripts/write-runtime-config.cjs'), 'local-mysql'], { cwd: fixture, env: isolatedEnvironment, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const runtimeText = readFileSync(join(fixture, 'dist/server-config.json'), 'utf8')
  assert.deepEqual(JSON.parse(runtimeText), {
    environment: 'local', backend: 'api', apiBaseUrl: 'https://shop.example.test/api/app/v1', lookupApiUrl: endpoint,
  })
  assert.equal(runtimeText.includes('fixture-do-not-export'), false)
})
