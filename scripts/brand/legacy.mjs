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
  /\.(png|jpe?g|gif|webp|ico|icns|pdf|ttf|otf|woff2?|mp4|mov|mp3|wav|zip|gz|jar|keystore|jks|p12|bin|riv|lottie|webm|avif|bmp|eot|apk|aab|ipa|hbc)$/i

export const isProbablyBinary = (buf) => buf.subarray(0, 8000).includes(0)
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
