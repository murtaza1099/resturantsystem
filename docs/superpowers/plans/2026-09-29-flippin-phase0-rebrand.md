# Flippin Phase 0 — Foundation & Full Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the forked Enatega monorepo into Flippin everywhere (names, IDs, URLs, languages, colours, fonts, assets, secrets), with a CI guard that fails if any Enatega reference comes back.

**Architecture:** Three small, tested Node scripts in `scripts/brand/` do the mechanical work (`check.mjs` finds legacy references, `rebrand.mjs` rewrites text and renames paths, `recolor.mjs` swaps the palette). Manual tasks then handle what scripts can't judge: app identity, secrets, contrast, fonts, assets and docs. GitHub Actions runs the script tests, the brand check and gitleaks on every push.

**Tech Stack:** Node 22+ (`node:test`, no dependencies), GitHub Actions, gitleaks, Expo EAS CLI, Next.js.

**Spec:** `docs/flippin/01-PRD.md` §9–10, §13 · Features G-01, G-06, G-07 · Flow F-22.

**Verified before writing:** the three scripts and their 29 tests were run against a copy of this repo on 2026-09-29. Result: 268 files rewritten, 23 paths renamed, 73 files recoloured, and `check.mjs` reports zero legacy references (excluding `.next` build caches, which are gitignored).

---

## File map

| Path | Responsibility |
|---|---|
| `package.json` (root, modify) | Root scripts: `brand:check`, `brand:rebrand`, `brand:recolor`, `test:scripts` |
| `scripts/brand/legacy.mjs` (create) | Shared: legacy pattern, file walker, allowlist, path collector |
| `scripts/brand/check.mjs` (create) | CLI + `findLegacy(root)` — exits 1 if any legacy reference |
| `scripts/brand/rebrand.mjs` (create) | `buildReplacements`, `rebrandText`, `rebrandTree` + CLI |
| `scripts/brand/recolor.mjs` (create) | `COLOR_MAP`, `recolorText`, `recolorTree` + CLI |
| `scripts/brand/*.test.mjs` (create) | node:test suites for the three scripts |
| `scripts/firebase-sw/write-sw.mjs` (create) | Generates Firebase messaging service worker from env at build time |
| `.github/workflows/brand-guard.yml` (create) | CI: script tests, brand check, gitleaks |
| `NOTICE.md` (create) | MIT attribution to the original project |
| `flippin-*/app.config.js`, `app.json`, `eas.json` (modify) | App identity |
| `flippin-*/public/*sw*.js`, `google-services.json`, `GoogleService-Info.plist` (delete from git) | Enatega secrets / build output |
| Theme files (modify) | `flippin-web/app/(localized)/global.css`, `flippin-admin/app/(localized)/global.css`, `flippin-app/src/utils/themeColors.js`, `flippin-rider/lib/utils/constants/colors.ts`, `flippin-store/lib/utils/constants/colors.ts` |

---

### Task 0: Accounts and prerequisites (no code)

- [ ] **Step 1: Create free accounts using the Flippin business email**
  GitHub (create org, e.g. `flippin-sa`), Expo (org `flippin`), Firebase (project `flippin`), Sentry (org `flippin`), PostHog, Cloudflare, Oracle Cloud, Resend. Save logins in a password manager.

- [ ] **Step 2: Fork the one GitHub dependency**
  `flippin-app/package.json` depends on `git+https://github.com/enatega/activity-controller.git#72b42897…`. Open https://github.com/enatega/activity-controller and click **Fork** into your org (e.g. `flippin-sa`). Confirm the commit `72b42897aa97ce4e000ecec95d610efa46f54979` exists in the fork.

- [ ] **Step 3: Record decisions in `docs/flippin/01-PRD.md` §17**
  Domain (the scripts use `rms.flippin.pk`. If you pick another domain, change the host strings in `buildReplacements` in Task 1 before running Task 3), and the exact Frosted White hex.

---

### Task 1: Brand scripts with tests

**Files:**
- Create: `scripts/brand/legacy.mjs`, `scripts/brand/check.mjs`, `scripts/brand/rebrand.mjs`, `scripts/brand/recolor.mjs`
- Create: `scripts/brand/check.test.mjs`, `scripts/brand/rebrand.test.mjs`, `scripts/brand/recolor.test.mjs`
- Modify: `package.json` (root)

- [ ] **Step 1: Create a branch**

```bash
git checkout -b rebrand/flippin
```

- [ ] **Step 2: Replace root `package.json`**

The current root `package.json` is absent (only a stub `package-lock.json` exists). Create `package.json`:

```json
{
  "name": "flippin",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "brand:check": "node scripts/brand/check.mjs .",
    "brand:rebrand": "node scripts/brand/rebrand.mjs .",
    "brand:recolor": "node scripts/brand/recolor.mjs .",
    "test:scripts": "node --test scripts/brand/*.test.mjs scripts/firebase-sw/*.test.mjs"
  }
}
```

Then delete the stub lockfile: `git rm package-lock.json`. A new one is generated if root deps are ever added.

- [ ] **Step 3: Write the failing tests**

`scripts/brand/check.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findLegacy } from './check.mjs'

test('finds legacy brand in content and path names, skips allowed and ignored', () => {
  const root = mkdtempSync(join(tmpdir(), 'brand-'))
  writeFileSync(join(root, 'a.js'), 'ok\nconst name = "Enatega"\n')
  mkdirSync(join(root, 'enatega-assets'))
  writeFileSync(join(root, 'enatega-assets', 'b.txt'), 'clean\n')
  writeFileSync(join(root, 'LICENSE'), 'Copyright Ninjas Code\n')
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'node_modules', 'c.js'), 'enatega\n')
  mkdirSync(join(root, 'docs', 'flippin'), { recursive: true })
  writeFileSync(join(root, 'docs', 'flippin', 'PRD.md'), 'Forked from Enatega\n')
  writeFileSync(join(root, 'ar.json'), '{"welcome":"إيناتيجا"}\n')
  writeFileSync(join(root, 'clean.js'), 'const name = "Flippin"\n')

  const hits = findLegacy(root).map((h) => `${h.file}:${h.line}`).sort()
  assert.deepEqual(hits, ['a.js:2', 'ar.json:1', 'enatega-assets/b.txt:0'])
})

test('returns nothing for a clean tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'brand-'))
  writeFileSync(join(root, 'index.js'), 'export const brand = "Flippin"\n')
  assert.deepEqual(findLegacy(root), [])
})
```

`scripts/brand/rebrand.test.mjs`:

```js
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
```

`scripts/brand/recolor.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { recolorText } from './recolor.mjs'

test('maps every legacy green, case-insensitively', () => {
  assert.equal(recolorText("primary: '#90E36D',"), "primary: '#00FD54',")
  assert.equal(recolorText('--primary-color: #75d04b;'), '--primary-color: #00FD54;')
  assert.equal(recolorText('--primary-dark: #5AC12F;'), '--primary-dark: #007A29;')
  assert.equal(recolorText('tagColor: "#AAC810",'), 'tagColor: "#00FD54",')
  assert.equal(recolorText('--primary-light: #f3ffee;'), '--primary-light: #E6FFEE;')
})

test('maps the focus ring rgba', () => {
  assert.equal(recolorText('--primary-focus: rgba(117, 208, 75, 0.32);'), '--primary-focus: rgba(0, 253, 84, 0.32);')
})

test('does not touch longer hex values or unrelated colours', () => {
  assert.equal(recolorText('#90e36d80'), '#90e36d80')
  assert.equal(recolorText('color: #151914;'), 'color: #151914;')
})

test('is idempotent', () => {
  const once = recolorText('a:#90E36D b:#5ac12f')
  assert.equal(recolorText(once), once)
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `node --test scripts/brand/*.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./check.mjs`, `./rebrand.mjs`, `./recolor.mjs`.

- [ ] **Step 5: Implement `scripts/brand/legacy.mjs`**

```js
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Any spelling of the old brand/company: English, Arabic, Persian.
export const LEGACY_PATTERN = /enatega|ninjas[\s_-]?code|إيناتيجا|إناتيغا|اناتگا/i

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.expo', 'dist', 'build', 'coverage', 'ios', 'android'
])
const ALLOWED_FILES = new Set(['LICENSE', 'LICENSE.md', 'NOTICE.md'])
// Docs that intentionally describe the fork origin, and these scripts themselves.
const ALLOWED_PREFIXES = ['docs/flippin/', 'docs/superpowers/', 'scripts/brand/']
const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|ico|icns|pdf|ttf|otf|woff2?|mp4|mov|mp3|wav|zip|gz|jar|keystore|jks|p12|bin|riv)$/i

export const toRel = (root, file) => relative(root, file).split(sep).join('/')
export const isText = (rel) => !BINARY_EXT.test(rel)
export const isAllowed = (rel) =>
  ALLOWED_FILES.has(rel.split('/').pop()) || ALLOWED_PREFIXES.some((p) => rel.startsWith(p))

export function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walkFiles(full)
    else if (entry.isFile()) yield full
  }
}

// Files and folders whose own name contains a legacy spelling, children before parents.
export function collectLegacyPaths(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectLegacyPaths(full, out)
    if (LEGACY_PATTERN.test(entry.name)) out.push(full)
  }
  return out
}
```

- [ ] **Step 6: Implement `scripts/brand/check.mjs`**

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { LEGACY_PATTERN, walkFiles, isText, isAllowed, toRel } from './legacy.mjs'

export function findLegacy(root) {
  const hits = []
  for (const file of walkFiles(root)) {
    const rel = toRel(root, file)
    if (isAllowed(rel)) continue
    if (LEGACY_PATTERN.test(rel)) hits.push({ file: rel, line: 0, text: '(path name)' })
    if (!isText(rel)) continue
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, i) => {
        if (LEGACY_PATTERN.test(text)) hits.push({ file: rel, line: i + 1, text: text.trim().slice(0, 120) })
      })
  }
  return hits
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hits = findLegacy(resolve(process.argv[2] ?? '.'))
  for (const h of hits.slice(0, 50)) console.log(`${h.file}:${h.line}  ${h.text}`)
  if (hits.length) {
    console.error(`\n✗ ${hits.length} legacy brand references found`)
    process.exit(1)
  }
  console.log('✓ No legacy brand references')
}
```

- [ ] **Step 7: Implement `scripts/brand/rebrand.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { walkFiles, isText, isAllowed, toRel, collectLegacyPaths } from './legacy.mjs'

// Change these two lines to move Flippin to another domain / bundle-ID prefix.
export const DOMAIN = 'rms.flippin.pk'
export const BUNDLE_PREFIX = 'pk.flippin'

// Order matters: specific rules first, generic case-preserving rules last.
export function buildReplacements({ ghOwner } = {}) {
  if (!ghOwner) throw new Error('ghOwner is required (GitHub user/org that owns your activity-controller fork)')
  return [
    // 1. Git dependency -> your fork
    [/github\.com\/enatega\/activity-controller/g, `github.com/${ghOwner}/activity-controller`],
    // 2. Hosts -> Flippin domains
    [/enatega-multivendor-api-production-9b09\.up\.railway\.app/g, `api.${DOMAIN}`],
    [/aws-server-v2\.enatega\.com/g, `api.${DOMAIN}`],
    [/backup-server\.enatega\.com/g, `api-backup.${DOMAIN}`],
    [/(www\.)?multivendor\.enatega\.com/g, DOMAIN],
    [/enatega-singlevendor-admin\.netlify\.app/g, `store-admin.${DOMAIN}`],
    [/enatega-web\.netlify\.app/g, DOMAIN],
    [/multivendor-admin\.ninjascode\.com/g, `admin.${DOMAIN}`],
    [/assets\.enatega\.com/g, `assets.${DOMAIN}`],
    [/(www\.)?enatega\.com/g, DOMAIN],
    [/(www\.)?ninjascode\.com/g, DOMAIN],
    // 3. App identifiers
    [/group\.com\.enatega\.multivendor\.shared/g, `group.${BUNDLE_PREFIX}.customer.shared`],
    [/com\.enatega\.multivendor/g, `${BUNDLE_PREFIX}.customer`],
    [/com\.enatega\.multirider/g, `${BUNDLE_PREFIX}.rider`],
    [/multivendor\.enatega\.restaurant/g, `${BUNDLE_PREFIX}.store`],
    [/enategamultivendor/g, 'flippin'],
    [/ninjas_code/g, 'flippin'],
    // 4. Folder names
    [/enatega-multivendor-(app|web|rider|store|admin)/g, 'flippin-$1'],
    [/enatega-singlevendor-admin/g, 'flippin-singlevendor-admin'],
    // 5. Display names
    [/Enatega Multivendor Rider/g, 'Flippin Rider'],
    [/Enatega Multi(vendor)?\b/g, 'Flippin'],
    // 6. Arabic / Persian spellings
    [/إيناتيجا|إناتيغا/g, 'فليبن'],
    [/اناتگا/g, 'فلیپن'],
    // 7. Company name
    [/Ninjas ?Code/g, 'Flippin'],
    [/ninjas[\s_-]?code/gi, 'flippin'],
    // 8. Generic, case-preserving
    [/ENATEGA/g, 'FLIPPIN'],
    [/Enatega/g, 'Flippin'],
    [/enatega/gi, 'flippin']
  ]
}

export const rebrandText = (text, replacements) =>
  replacements.reduce((out, [pattern, to]) => out.replace(pattern, to), text)

export function rebrandTree(root, replacements, { dryRun = false, log = console.log } = {}) {
  let rewritten = 0
  for (const file of walkFiles(root)) {
    const rel = toRel(root, file)
    if (isAllowed(rel) || !isText(rel)) continue
    const before = readFileSync(file, 'utf8')
    const after = rebrandText(before, replacements)
    if (after === before) continue
    rewritten++
    if (!dryRun) writeFileSync(file, after)
  }
  const paths = collectLegacyPaths(root).filter((p) => !isAllowed(toRel(root, p)))
  for (const p of paths) {
    const target = join(dirname(p), rebrandText(basename(p), replacements))
    log(`rename ${toRel(root, p)} -> ${toRel(root, target)}`)
    if (!dryRun) renameSync(p, target)
  }
  log(`${dryRun ? '[dry-run] ' : ''}${rewritten} files rewritten, ${paths.length} paths renamed`)
  return { rewritten, renamed: paths.length }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const ownerAt = args.indexOf('--gh-owner')
  const ghOwner = ownerAt >= 0 ? args[ownerAt + 1] : undefined
  const rootArg = args.find((a, i) => !a.startsWith('--') && (ownerAt < 0 || i !== ownerAt + 1))
  rebrandTree(resolve(rootArg ?? '.'), buildReplacements({ ghOwner }), { dryRun: args.includes('--dry-run') })
}
```

- [ ] **Step 8: Implement `scripts/brand/recolor.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { walkFiles, isAllowed, toRel } from './legacy.mjs'

// Old Enatega greens -> Flippin palette (PRD §9).
// Neon Green #00FD54 · Midnight Forest #001B0A · link green #007A29 (AA on white)
export const COLOR_MAP = {
  '#90e36d': '#00FD54', // app/rider/store primary
  '#75d04b': '#00FD54', // web/admin primary
  '#61d921': '#00D447', // app primary (alt)
  '#68c73e': '#00E64C', // hover
  '#56b02f': '#00D447', // pressed
  '#5ac12f': '#007A29', // primary-dark (used for text/caret) -> accessible link green
  '#aac810': '#00FD54', // rider/store accent
  '#89a207': '#007A29', // rider/store order complete
  '#f3ffee': '#E6FFEE', // primary-light tint
  '#b9e8a3': '#99FEBB' // disabled
}
const RGBA_OLD = /rgba\(\s*117\s*,\s*208\s*,\s*75\s*,/g // --primary-focus
const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|css|scss|json|svg)$/i
const HEX = new RegExp(`(${Object.keys(COLOR_MAP).join('|')})(?![0-9a-f])`, 'gi')

export const recolorText = (text) =>
  text.replace(HEX, (m) => COLOR_MAP[m.toLowerCase()]).replace(RGBA_OLD, 'rgba(0, 253, 84,')

export function recolorTree(root, { dryRun = false } = {}) {
  let rewritten = 0
  for (const file of walkFiles(root)) {
    const rel = toRel(root, file)
    if (isAllowed(rel) || !CODE_EXT.test(rel) || rel.endsWith('package-lock.json')) continue
    const before = readFileSync(file, 'utf8')
    const after = recolorText(before)
    if (after === before) continue
    rewritten++
    if (!dryRun) writeFileSync(file, after)
  }
  console.log(`${dryRun ? '[dry-run] ' : ''}${rewritten} files recoloured`)
  return rewritten
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  recolorTree(resolve(args.find((a) => !a.startsWith('--')) ?? '.'), { dryRun: args.includes('--dry-run') })
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `node --test scripts/brand/*.test.mjs`
Expected: `ℹ tests 29` · `ℹ pass 29` · `ℹ fail 0`

- [ ] **Step 10: Confirm the check currently fails on the repo (proves it works)**

Run: `npm run brand:check`
Expected: exit code 1, last line `✗ 7739 legacy brand references found` (the number may differ slightly).

- [ ] **Step 11: Commit**

```bash
git add package.json scripts/brand
git commit -m "chore(brand): add tested rebrand, recolor and brand-check scripts"
```

---

### Task 2: CI brand guard

**Files:**
- Create: `.github/workflows/brand-guard.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Brand guard

on:
  push:
    branches: [main, 'rebrand/**']
  pull_request:

jobs:
  brand:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Script unit tests
        run: npm run test:scripts
      - name: No legacy brand references
        run: npm run brand:check
      - name: No secrets committed
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> gitleaks-action is free for personal accounts. For a GitHub **organisation** it requires a free licence key from gitleaks.io (set `GITLEAKS_LICENSE` secret). Alternative: replace the step with `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo --no-git`.

- [ ] **Step 2: Commit (the job is expected to fail until Task 3 is done)**

```bash
git add .github/workflows/brand-guard.yml
git commit -m "ci: add brand guard (script tests, brand check, gitleaks)"
```

---

### Task 3: Run the rebrand

**Files:** every text file in the repo (script-driven). The 23 renamed paths include all six app folders.

- [ ] **Step 1: Close editors and dev servers**, since Windows locks open folders during rename. Delete local build caches (they are gitignored and regenerate):

```bash
rm -rf enatega-multivendor-web/.next enatega-multivendor-admin/.next enatega-singlevendor-admin/.next
```

- [ ] **Step 2: Dry run and read the output**

Run: `node scripts/brand/rebrand.mjs . --gh-owner flippin-sa --dry-run`
Expected: a list of `rename …` lines ending with `[dry-run] 268 files rewritten, 23 paths renamed` (numbers ±5).

- [ ] **Step 3: Run for real**

Run: `node scripts/brand/rebrand.mjs . --gh-owner flippin-sa`
Expected: `268 files rewritten, 23 paths renamed`

- [ ] **Step 4: Verify**

Run: `npm run brand:check`
Expected: `✓ No legacy brand references`

Run: `ls`
Expected: `flippin-admin flippin-app flippin-rider flippin-singlevendor-admin flippin-store flippin-web` (and no `enatega-*`).

- [ ] **Step 5: Review risky spots by hand**

```bash
git diff --stat | tail -1
git diff -- flippin-app/package.json flippin-*/app.config.js flippin-store/app.json flippin-*/eas.json
```
Check: the `activity-controller` URL points at your fork; bundle IDs are `pk.flippin.customer` / `pk.flippin.rider` / `pk.flippin.store`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(brand): rebrand Enatega to Flippin across all apps"
```

---

### Task 4: App identity (names, slugs, EAS projects, Google client)

**Files:**
- Modify: `flippin-app/app.config.js`, `flippin-rider/app.config.js`, `flippin-store/app.json`, each `eas.json`

- [ ] **Step 1: Set display names and slugs**

| File | `name` | `slug` | `scheme` |
|---|---|---|---|
| `flippin-app/app.config.js` | `'Flippin'` | `'flippin'` | `'flippin'` |
| `flippin-rider/app.config.js` | `'Flippin Rider'` | `'flippin-rider'` | `'pk.flippin.rider'` |
| `flippin-store/app.json` | `"Flippin Store"` | `"flippin-store"` | `"flippin-store"` |

Set `owner` to your Expo org (`'flippin'`) in all three. In `flippin-app/app.config.js` replace the long `description` with:

```js
    description: 'Flippin — food, groceries and more, delivered fast across Saudi Arabia.',
```

- [ ] **Step 2: Remove Enatega's Google OAuth fallback** in `flippin-app/app.config.js`. Replace the `fallbackUrlTypes` block and its use with:

```js
  if (!reversedGoogleIosClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID is required (create an iOS OAuth client in Google Cloud for pk.flippin.customer)')
  }
  const urlTypes = [
    { CFBundleURLSchemes: [reversedGoogleIosClientId] },
    { CFBundleURLSchemes: ['flippin'] }
  ]
```

- [ ] **Step 3: Create new EAS projects.** Delete the old `extra.eas.projectId` (and `updates.url` if it contains the old project ID) from each app config, then in each app folder:

```bash
cd flippin-app && npx eas-cli@latest init --non-interactive --force && cd ..
cd flippin-rider && npx eas-cli@latest init --non-interactive --force && cd ..
cd flippin-store && npx eas-cli@latest init --non-interactive --force && cd ..
```
Expected: each prints `Project successfully linked` and writes a new `projectId`.

- [ ] **Step 4: Point production API URLs at env, not hard-coded hosts.** In each `eas.json` production `env`, the rebrand already wrote `https://api.rms.flippin.pk/...`. Keep these, and add staging equivalents under `staging.env`:

```json
"EXPO_PUBLIC_SINGLE_VENDOR_GRAPHQL_URL": "https://api-staging.rms.flippin.pk/graphql",
"EXPO_PUBLIC_SINGLE_VENDOR_WS_GRAPHQL_URL": "wss://api-staging.rms.flippin.pk/graphql",
"EXPO_PUBLIC_SINGLE_VENDOR_REST_URL": "https://api-staging.rms.flippin.pk/"
```

- [ ] **Step 5: Verify the configs resolve**

```bash
cd flippin-app && EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID=com.googleusercontent.apps.test npx expo config --type public | grep -E "name|slug|bundleIdentifier|package" && cd ..
cd flippin-rider && npx expo config --type public | grep -E "name|slug|bundleIdentifier|package" && cd ..
cd flippin-store && npx expo config --type public | grep -E "name|slug|bundleIdentifier|package" && cd ..
```
Expected: Flippin names and `pk.flippin.*` IDs only.

- [ ] **Step 6: Commit**

```bash
git add flippin-app flippin-rider flippin-store
git commit -m "chore(identity): Flippin app names, slugs, EAS projects; drop Enatega OAuth fallback"
```

---

### Task 5: Remove Enatega secrets and committed build output

**Files:**
- Delete from git: `flippin-app/google-services.json`, `flippin-app/GoogleService-Info.plist`, `flippin-rider/google-services.json`, `flippin-store/google-services.json`, `flippin-web/public/sw.js` (committed build output)
- Move to template: `flippin-web/public/serviceWorker.js` (the PWA source) → `flippin-web/serviceWorker.template.js`
- Modify: `flippin-rider/lib/utils/service/sentry.ts`, `.gitignore`
- Create: `.gitleaksignore`
- Create: `scripts/firebase-sw/write-sw.mjs`, `scripts/firebase-sw/write-sw.test.mjs`
- Modify: `flippin-web/public/serviceWorker.js`, `flippin-admin/public/firebase-messaging-sw.js`, `flippin-singlevendor-admin/public/firebase-messaging-sw.js`, their `package.json` (`prebuild`)

- [ ] **Step 1: Untrack native Firebase files and ignore them**

```bash
git rm --cached flippin-app/google-services.json flippin-app/GoogleService-Info.plist flippin-rider/google-services.json flippin-store/google-services.json
git rm flippin-web/public/sw.js
cat >> .gitignore <<'EOF'

# Firebase native configs: provided via EAS file env vars
google-services.json
GoogleService-Info.plist
# Generated service workers
flippin-web/public/sw.js
flippin-*/public/firebase-messaging-sw.js
EOF
```

- [ ] **Step 2: Create Flippin Firebase apps.** In Firebase console → project `flippin` → add Android apps `pk.flippin.customer`, `pk.flippin.rider`, `pk.flippin.store`, iOS app `pk.flippin.customer`, and one Web app. Download the files and upload them as EAS file secrets:

```bash
cd flippin-app
npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --environment preview --environment development
npx eas-cli env:create --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist --environment production --environment preview --environment development
cd ..
```
Repeat `GOOGLE_SERVICES_JSON` for `flippin-rider` and `flippin-store`. Then in each app config use the env path:

```js
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
```
(and `process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist'` for iOS in `flippin-app`).

- [ ] **Step 3: Rider Sentry DSN from env.** In `flippin-rider/lib/utils/service/sentry.ts` replace the hard-coded `dsn: "https://…sentry.io/…"` line with:

```ts
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
```
Add `EXPO_PUBLIC_SENTRY_DSN` (from your new Sentry project `flippin-rider`) to `flippin-rider/eas.json` production `env`.

- [ ] **Step 4: Write the failing test for the service-worker generator**

`scripts/firebase-sw/write-sw.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderServiceWorker, REQUIRED_KEYS } from './write-sw.mjs'

const env = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'k',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'flippin.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'flippin',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'flippin.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc'
}

test('injects firebase config from env into the template', () => {
  const out = renderServiceWorker('firebase.initializeApp(__FIREBASE_CONFIG__);', env)
  assert.match(out, /"projectId":"flippin"/)
  assert.doesNotMatch(out, /__FIREBASE_CONFIG__/)
})

test('fails loudly when a key is missing', () => {
  const { NEXT_PUBLIC_FIREBASE_APP_ID, ...partial } = env
  assert.throws(() => renderServiceWorker('__FIREBASE_CONFIG__', partial), /NEXT_PUBLIC_FIREBASE_APP_ID/)
})

test('lists six required keys', () => {
  assert.equal(REQUIRED_KEYS.length, 6)
})
```

Run: `node --test scripts/firebase-sw/*.test.mjs`
Expected: FAIL (`ERR_MODULE_NOT_FOUND`).

- [ ] **Step 5: Implement `scripts/firebase-sw/write-sw.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const REQUIRED_KEYS = [
  ['apiKey', 'NEXT_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'NEXT_PUBLIC_FIREBASE_APP_ID']
]

export function renderServiceWorker(template, env) {
  const missing = REQUIRED_KEYS.filter(([, name]) => !env[name]).map(([, name]) => name)
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`)
  const config = Object.fromEntries(REQUIRED_KEYS.map(([key, name]) => [key, env[name]]))
  return template.replace('__FIREBASE_CONFIG__', JSON.stringify(config))
}

// Usage: node write-sw.mjs <template> <output>
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [template, output] = process.argv.slice(2)
  writeFileSync(output, renderServiceWorker(readFileSync(template, 'utf8'), process.env))
  console.log(`wrote ${output}`)
}
```

Run: `node --test scripts/firebase-sw/*.test.mjs`
Expected: `ℹ pass 3` · `ℹ fail 0`

- [ ] **Step 6: Turn the service workers into templates**

For `flippin-admin` and `flippin-singlevendor-admin`: `git mv public/firebase-messaging-sw.js firebase-messaging-sw.template.js`, then replace the whole `firebase.initializeApp({ … })` object with `firebase.initializeApp(__FIREBASE_CONFIG__);`. Add to each `package.json` `scripts`:

```json
"prebuild": "node ../scripts/firebase-sw/write-sw.mjs firebase-messaging-sw.template.js public/firebase-messaging-sw.js",
"predev": "node ../scripts/firebase-sw/write-sw.mjs firebase-messaging-sw.template.js public/firebase-messaging-sw.js"
```

For `flippin-web/public/serviceWorker.js` (bundled by the PWA plugin into `sw.js`): replace its `firebase.initializeApp({ … })` object with `firebase.initializeApp(__FIREBASE_CONFIG__);`, `git mv` it to `flippin-web/serviceWorker.template.js`, and add:

```json
"prebuild": "node ../scripts/firebase-sw/write-sw.mjs serviceWorker.template.js public/serviceWorker.js",
"predev": "node ../scripts/firebase-sw/write-sw.mjs serviceWorker.template.js public/serviceWorker.js"
```
Add `flippin-web/public/serviceWorker.js` to `.gitignore`. Put the six `NEXT_PUBLIC_FIREBASE_*` values in each app's `.env.local` (not committed).

- [ ] **Step 7: Verify no Enatega Firebase or Sentry values remain**

```bash
git grep -nE "AIzaSyDx_iSQ|AIzaSyDh11Td|AIzaSyAoovt_|438532750182|o4507787652694016|650001300965" || echo "clean"
```
Expected: `clean`

- [ ] **Step 8: Baseline the old keys that remain in git history**

The Enatega keys are gone from the files but still exist in earlier commits, so gitleaks would fail CI forever. They are Enatega's keys, not yours, and Flippin no longer uses them. Record their fingerprints so only **new** leaks fail:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo --report-format json --report-path /repo/gitleaks-report.json --exit-code 0
node -e "const r=require('./gitleaks-report.json');require('fs').writeFileSync('.gitleaksignore',r.map(f=>f.Fingerprint).join('\n')+'\n');console.log(r.length+' historical findings baselined')"
rm gitleaks-report.json
```
Expected: `N historical findings baselined`. Open `.gitleaksignore` and check that every entry's file/commit is from **before** this branch. Then confirm: `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo` exits 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "security: remove Enatega Firebase/Sentry/OAuth config; env-driven service workers"
```

---

### Task 6: Recolour to the Flippin palette

**Files:** 73 code files (script-driven), then the five theme files by hand.

- [ ] **Step 1: Run the recolour**

Run: `node scripts/brand/recolor.mjs . --dry-run` → expect `[dry-run] 73 files recoloured` (±5)
Run: `node scripts/brand/recolor.mjs .` → expect `73 files recoloured`

- [ ] **Step 2: Add Midnight Forest and on-primary tokens to web and admin.** In `flippin-web/app/(localized)/global.css` and `flippin-admin/app/(localized)/global.css`, directly under `--primary-disabled`, add:

```css
  --brand-ink: #001b0a;          /* Midnight Forest */
  --brand-surface: #ffffff;      /* Frosted White */
  --on-primary: #001b0a;         /* text/icons on Neon Green */
  --brand-link: #007a29;         /* green text on light surfaces (AA) */
```
and in `tailwind.config.ts` `colors` of both apps add:

```ts
        'brand-ink': 'var(--brand-ink)',
        'on-primary': 'var(--on-primary)',
        'brand-link': 'var(--brand-link)',
```

- [ ] **Step 3: Mobile theme files: set the text colour used on primary buttons.** In `flippin-rider/lib/utils/constants/colors.ts` and `flippin-store/lib/utils/constants/colors.ts` set `buttonText: "#001B0A"` in `light` and `dark`. In `flippin-app/src/utils/themeColors.js` add `onPrimary: '#001B0A'` next to each `primary:` key.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style(brand): Flippin palette (Neon Green, Midnight Forest) across apps"
```

---

### Task 7: Contrast pass (Neon Green is never text on white)

- [ ] **Step 1: Find green used as text colour**

```bash
git grep -nE "color:\s*(var\(--primary-color\)|['\"]?#00FD54)" -- "*.css" "*.js" "*.jsx" "*.ts" "*.tsx"
git grep -nE "text-primary-color" -- "*.tsx" "*.ts"
```

- [ ] **Step 2: Fix each hit.** If the text sits on a light surface, change it to `var(--brand-link)` / `text-brand-link` / `'#007A29'`. If it sits on a dark surface (`#001B0A`/dark mode), leave it.

- [ ] **Step 3: Find white text on green fills**

```bash
git grep -nE "(background(-color)?:\s*var\(--primary-color\)|bg-primary-color)" -- "*.css" "*.tsx" | head -50
```
For each button/badge, make the text `var(--on-primary)` / `text-on-primary` (Midnight Forest). White on `#00FD54` is ~1.4:1 and fails WCAG.

- [ ] **Step 4: Verify visually.** Run `cd flippin-web && npm run dev` and open `/`, `/restaurants`, `/order/checkout`, and the `/profile` pages in light and dark mode. Buttons read dark-on-green and links are dark green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(a11y): brand contrast — dark text on Neon Green, AA link green on light"
```

---

### Task 8: Fonts (Satoshi + IBM Plex Sans Arabic)

**Files:**
- Create: `flippin-web/app/fonts/Satoshi-Variable.woff2`, same in `flippin-admin/app/fonts/`
- Create: `flippin-app/assets/fonts/Satoshi-{Regular,Medium,Bold,Black}.otf`, same in rider/store `assets/fonts/`
- Modify: web/admin root layout; mobile font loaders

- [ ] **Step 1: Download fonts.** Satoshi from https://www.fontshare.com/fonts/satoshi (free, ITF Free Font License, allows commercial use). IBM Plex Sans Arabic via `npm i @fontsource/ibm-plex-sans-arabic` (web) or from https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic (mobile .ttf).

- [ ] **Step 2: Web and admin.** Find the current font setup:

```bash
git grep -n "next/font" flippin-web/app flippin-admin/app
```
Replace the Inter import in that layout with:

```tsx
import localFont from 'next/font/local'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'

const satoshi = localFont({
  src: './fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  weight: '300 900',
  display: 'swap'
})
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic',
  display: 'swap'
})
```
Put `${satoshi.variable} ${plexArabic.variable}` on `<html className=…>`. In `tailwind.config.ts` set `fontFamily: { sans: ['var(--font-satoshi)', 'var(--font-arabic)', 'system-ui', 'sans-serif'] }`, and in `global.css` add `[dir='rtl'] body { font-family: var(--font-arabic), var(--font-satoshi), system-ui, sans-serif; }`.

- [ ] **Step 3: Mobile apps.** Find the font loader:

```bash
git grep -nE "useFonts|Font.loadAsync" flippin-app/src flippin-app/App.js flippin-rider/app flippin-store/app
```
Register the new files under the **existing font family keys** (so styles keep working). For example, if the app loads `MuseoSans500: require('./assets/font/…')`, map each weight to the matching Satoshi file, and add `IBMPlexSansArabic: require('./assets/fonts/IBMPlexSansArabic-Regular.ttf')`. Use the Arabic family when `i18n.dir() === 'rtl'` in the shared text style helper (`flippin-app/src/utils/textStyles.js`, `fontStyles.js`).

- [ ] **Step 4: Verify.** Web: open `/?locale=ar` (or switch language). Arabic renders in IBM Plex Sans Arabic and Latin in Satoshi. Mobile: `npx expo start` in `flippin-app`, switch to Arabic in Settings, and check the Home and Cart screens.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(brand): Satoshi + IBM Plex Sans Arabic typography"
```

---

### Task 9: Brand assets

**Files (replace contents, keep filenames and sizes):**

| App | Files to replace |
|---|---|
| `flippin-app` | `assets/icon.png` (1024²), `assets/adaptive-icon.png` / Android foreground, splash images referenced in `app.config.js` (`expo-splash-screen` plugin), `splash_claud_assets/flippin-animated-splash/*`, `targets/widget/flippin-logo.png`, `targets/widget/Assets.xcassets/FlippinLogo.imageset/*` |
| `flippin-rider` | `assets/images/icon.png`, adaptive icon, splash, `splash_claud_assets/flippin-animated-splash/*` |
| `flippin-store` | icon/adaptive/splash referenced in `app.json` |
| `flippin-web` | `lib/assets/flippin-logo.png`, `public/favicon.ico`, `public/192.png`, `public/512.png`, `public/manifest.json` (name, short_name, theme_color `#001B0A`, background_color `#FFFFFF`), OG image |
| `flippin-admin`, `flippin-singlevendor-admin` | `public/favicon.ico`, logo images under `public/` |

- [ ] **Step 1: List every image referenced by config so none are missed**

```bash
git grep -nE "\.(png|jpg|svg|ico)['\"]" -- "flippin-*/app.config.js" "flippin-*/app.json" "flippin-*/public/manifest.json"
```

- [ ] **Step 2: Export from the brand file.** App icon: Midnight Forest tile with the green mark, 1024×1024, no transparency (iOS). Android adaptive: green mark on transparent 1024², background colour `#001B0A`. Splash: logo centred on `#001B0A` (dark) and `#FFFFFF` (light). Notification icon: white mark on transparent, 96².

- [ ] **Step 3: Update manifest and splash colours**

`flippin-web/public/manifest.json`:
```json
  "name": "Flippin",
  "short_name": "Flippin",
  "theme_color": "#001B0A",
  "background_color": "#FFFFFF",
```
In the app configs set `androidStatusBar.backgroundColor` and the splash plugin `backgroundColor` to `#001B0A` (dark) / `#FFFFFF` (light).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style(brand): Flippin icons, splash, favicons, manifest"
```

---

### Task 10: NOTICE, README and product docs

**Files:**
- Create: `NOTICE.md`
- Modify: `README.md`, `flippin-web/DESIGN.md`, `flippin-web/PRODUCT.md`, each app `README.md`

- [ ] **Step 1: Create `NOTICE.md`**

```markdown
# Notice

Flippin includes software originally developed as the Enatega Multivendor
Food Delivery Solution by Ninjas Code, released under the MIT License.
The original copyright and license notices are kept in each LICENSE file.
```

- [ ] **Step 2: Rewrite root `README.md`** with: what Flippin is (one paragraph from PRD §1), the app table (PRD §5), local setup per app (`npm ci`, env files, `npm run dev` / `npx expo start`), links to `docs/flippin/*`, and a "Credits" line pointing to `NOTICE.md`. Remove all Enatega badges, social links and YouTube embeds.

- [ ] **Step 3: Update `flippin-web/DESIGN.md`** front-matter: `name: "Flippin"`, colours from PRD §9 (`primary: "#00FD54"`, `charcoal-ink` → `"#001B0A"`, `primary-dark: "#007A29"`), typography `Satoshi` / `IBM Plex Sans Arabic`. Update `PRODUCT.md` "Users"/"Positioning" to Flippin + Saudi Arabia, restaurants first.

- [ ] **Step 4: Verify**

Run: `npm run brand:check`
Expected: `✓ No legacy brand references`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: Flippin README, NOTICE, design and product docs"
```

---

### Task 11: Full verification

- [ ] **Step 1: Install and type-check every app**

```bash
for app in flippin-web flippin-admin flippin-singlevendor-admin; do (cd $app && npm ci && npx tsc --noEmit && npm run lint) || echo "FAIL $app"; done
for app in flippin-app flippin-rider flippin-store; do (cd $app && npm ci && npx expo-doctor) || echo "FAIL $app"; done
(cd flippin-rider && npx tsc --noEmit); (cd flippin-store && npx tsc --noEmit)
```
Expected: no `FAIL` lines. If `flippin-app` `npm ci` fails on `activity-controller`, confirm the fork URL and commit hash from Task 0 Step 2.

- [ ] **Step 2: Build the web apps**

```bash
(cd flippin-web && npm run build) && (cd flippin-admin && npm run build) && (cd flippin-singlevendor-admin && npm run build)
```
Expected: `✓ Compiled successfully` for each. The Firebase `NEXT_PUBLIC_*` env must be set (Task 5).

- [ ] **Step 3: Preview-build one mobile app**

```bash
cd flippin-app && npx eas-cli build --profile staging --platform android --non-interactive
```
Expected: build finishes and the APK shows "Flippin", the Flippin icon and green-on-dark splash. (API calls fail until Phase 1; that's expected.)

- [ ] **Step 4: Final guard**

```bash
npm run test:scripts && npm run brand:check && git grep -nE "enatega|ninjascode" -- ':!LICENSE*' ':!NOTICE.md' ':!docs/flippin' ':!docs/superpowers' ':!scripts/brand' || echo "clean"
```
Expected: tests pass, `✓ No legacy brand references`, `clean`.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin rebrand/flippin
gh pr create --title "Phase 0: Flippin rebrand & foundation" --body "Implements docs/superpowers/plans/2026-09-29-flippin-phase0-rebrand.md"
```
Expected: the Brand guard workflow passes on the PR. Run `/code-review` on the PR before merging.

---

## Phase 0 exit criteria (from docs/flippin/04-PLAN.md)

- [ ] `npm run brand:check` passes locally and in CI
- [ ] gitleaks passes; no Enatega Firebase/Sentry/OAuth values anywhere
- [ ] All six apps install, type-check and build
- [ ] Apps visibly show the Flippin name, icon, colours and fonts in Arabic and English
- [ ] PR reviewed and merged to `main`
