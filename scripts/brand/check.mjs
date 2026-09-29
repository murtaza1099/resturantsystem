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
