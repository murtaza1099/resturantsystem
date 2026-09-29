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
