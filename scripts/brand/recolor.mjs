#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { walkFiles, isAllowed, isProbablyBinary, toRel } from './legacy.mjs'

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
    const buf = readFileSync(file)
    if (isProbablyBinary(buf)) continue
    const before = buf.toString('utf8')
    const after = recolorText(before)
    if (after === before) continue
    rewritten++
    if (!dryRun) writeFileSync(file, after)
  }
  console.log(`${dryRun ? '[dry-run] ' : ''}${rewritten} files recoloured`)
  return rewritten
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  recolorTree(resolve(args.find((a) => !a.startsWith('--')) ?? '.'), { dryRun: args.includes('--dry-run') })
}
