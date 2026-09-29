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
