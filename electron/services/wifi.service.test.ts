import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseMacSsid } from './wifi.service.ts'

describe('parseMacSsid', () => {
  it('reads the SSID from ipconfig getsummary, not the BSSID', () => {
    const summary = [
      '<dictionary> {',
      '  BSSID : 12:34:56:78:9a:bc',
      '  InterfaceType : WiFi',
      '  SSID : Home Wi-Fi 5G',
      '}',
    ].join('\n')
    assert.equal(parseMacSsid(summary), 'Home Wi-Fi 5G')
  })

  it('treats the macOS 15+ redacted value as unknown', () => {
    assert.equal(parseMacSsid('<dictionary> {\n  SSID : <redacted>\n}'), null)
  })

  it('returns null when the interface is not associated', () => {
    assert.equal(parseMacSsid('<dictionary> {\n  BSSID : 12:34:56:78:9a:bc\n  InterfaceType : WiFi\n}'), null)
  })
})
