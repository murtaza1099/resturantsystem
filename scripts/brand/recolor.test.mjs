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
