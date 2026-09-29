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

test('does not report content hits in binary-looking files', () => {
  const root = mkdtempSync(join(tmpdir(), 'brand-'))
  writeFileSync(join(root, 'x.dat'), Buffer.from([0x65, 0x6e, 0x61, 0x74, 0x65, 0x67, 0x61, 0x00, 0x01]))
  assert.deepEqual(findLegacy(root), [])
})
