import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildReplacements, rebrandText, rebrandTree } from './rebrand.mjs'
import { LEGACY_PATTERN } from './legacy.mjs'

const R = buildReplacements({ ghOwner: 'flippin-sa' })

const cases = [
  ['https://aws-server-v2.enatega.com/graphql', 'https://api.rms.flippin.pk/graphql'],
  ['https://backup-server.enatega.com/', 'https://api-backup.rms.flippin.pk/'],
  ['wss://enatega-multivendor-api-production-9b09.up.railway.app/graphql', 'wss://api.rms.flippin.pk/graphql'],
  ['https://multivendor.enatega.com/privacy', 'https://rms.flippin.pk/privacy'],
  ['https://multivendor-admin.ninjascode.com/dashboard', 'https://admin.rms.flippin.pk/dashboard'],
  ["bundleIdentifier: 'com.enatega.multivendor'", "bundleIdentifier: 'pk.flippin.customer'"],
  ["'group.com.enatega.multivendor.shared'", "'group.pk.flippin.customer.shared'"],
  ["package: 'com.enatega.multirider'", "package: 'pk.flippin.rider'"],
  ['"package": "multivendor.enatega.restaurant"', '"package": "pk.flippin.store"'],
  ["scheme: 'enategamultivendor'", "scheme: 'flippin'"],
  ["owner: 'ninjas_code'", "owner: 'flippin'"],
  ['cd enatega-multivendor-app && cd ../enatega-singlevendor-admin', 'cd flippin-app && cd ../flippin-singlevendor-admin'],
  ["name: 'Enatega Multivendor Rider'", "name: 'Flippin Rider'"],
  ["name: 'Enatega Multi',", "name: 'Flippin',"],
  ['ENATEGA_ADMIN_AUDIT.pdf', 'FLIPPIN_ADMIN_AUDIT.pdf'],
  ['EnategaLogo/enatega-logo.png', 'FlippinLogo/flippin-logo.png'],
  ['مرحبا بك في إيناتيجا', 'مرحبا بك في فليبن'],
  ['به اناتگا خوش آمدید', 'به فلیپن خوش آمدید'],
  ['git+https://github.com/enatega/activity-controller.git#72b4', 'git+https://github.com/flippin-sa/activity-controller.git#72b4'],
  ['Powered by Ninjas Code', 'Powered by Flippin']
]

for (const [input, expected] of cases) {
  test(`rebrands: ${input}`, () => {
    const out = rebrandText(input, R)
    assert.equal(out, expected)
    assert.equal(LEGACY_PATTERN.test(out), false)
  })
}

test('is idempotent', () => {
  for (const [input] of cases) {
    const once = rebrandText(input, R)
    assert.equal(rebrandText(once, R), once)
  }
})

test('requires ghOwner', () => {
  assert.throws(() => buildReplacements({}), /ghOwner is required/)
})

test('rebrandTree rewrites content and renames nested paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'rebrand-'))
  mkdirSync(join(root, 'EnategaLogo.imageset'))
  writeFileSync(join(root, 'EnategaLogo.imageset', 'enatega-logo.png'), 'binary')
  writeFileSync(join(root, 'app.js'), "import logo from './EnategaLogo.imageset/enatega-logo.png'\n")
  writeFileSync(join(root, 'LICENSE'), 'Copyright Ninjas Code\n')
  const result = rebrandTree(root, R, { log: () => {} })
  assert.deepEqual(result, { rewritten: 1, renamed: 2 })
  assert.ok(existsSync(join(root, 'FlippinLogo.imageset', 'flippin-logo.png')))
  assert.equal(readFileSync(join(root, 'app.js'), 'utf8'), "import logo from './FlippinLogo.imageset/flippin-logo.png'\n")
  assert.equal(readFileSync(join(root, 'LICENSE'), 'utf8'), 'Copyright Ninjas Code\n')
})
