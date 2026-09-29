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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [template, output] = process.argv.slice(2)
  writeFileSync(output, renderServiceWorker(readFileSync(template, 'utf8'), process.env))
  console.log(`wrote ${output}`)
}
