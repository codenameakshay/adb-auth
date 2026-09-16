import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDeviceList,
  parseMdnsServices,
  isPairOutputSuccessful,
  isConnectOutputSuccessful,
  stripTrailingDot,
} from './adb.service.ts'

describe('parseDeviceList', () => {
  it('skips the header line and daemon status lines', () => {
    const output = [
      'List of devices attached',
      '* daemon not running; starting now at tcp:5037',
      '* daemon started successfully',
    ].join('\n')
    assert.deepEqual(parseDeviceList(output), [])
  })

  it('parses a USB device with model and product', () => {
    const output =
      'emulator-5554 device product:sdk_gphone64_arm64 model:Pixel_8_Pro device:emu64a transport_id:5'
    const [device] = parseDeviceList(output)
    assert.equal(device.serial, 'emulator-5554')
    assert.equal(device.status, 'device')
    assert.equal(device.isWifi, false)
    assert.equal(device.model, 'Pixel_8_Pro')
    assert.equal(device.product, 'sdk_gphone64_arm64')
    assert.equal(device.ip, undefined)
    assert.equal(device.port, undefined)
  })

  it('parses a wireless device with ip, port and offline status', () => {
    const output = '192.168.1.44:39029 offline product:panther model:Pixel_7 device:panther transport_id:8'
    const [device] = parseDeviceList(output)
    assert.equal(device.isWifi, true)
    assert.equal(device.ip, '192.168.1.44')
    assert.equal(device.port, 39029)
    assert.equal(device.status, 'offline')
  })

  it('keeps unauthorized devices', () => {
    const [device] = parseDeviceList('192.168.1.44:39029 unauthorized')
    assert.equal(device.status, 'unauthorized')
  })

  it('drops lines with an unknown status', () => {
    assert.deepEqual(parseDeviceList('emulator-5554 recovery'), [])
  })

  it('drops lines with fewer than 2 fields', () => {
    assert.deepEqual(parseDeviceList('emulator-5554'), [])
  })

  it('ignores blank lines and CRLF endings without producing bogus devices', () => {
    const output =
      'List of devices attached\r\n' +
      'emulator-5554 device product:sdk_gphone64_arm64 model:Pixel_8_Pro device:emu64a transport_id:5\r\n' +
      '192.168.1.44:39029 offline product:panther model:Pixel_7 device:panther transport_id:8\r\n' +
      '\r\n'
    const devices = parseDeviceList(output)
    assert.equal(devices.length, 2)
    assert.equal(devices[0].status, 'device')
    assert.equal(devices[1].status, 'offline')
    assert.equal(devices[1].ip, '192.168.1.44')
    assert.equal(devices[1].port, 39029)
  })
})

describe('parseMdnsServices', () => {
  it('parses pairing and connect services', () => {
    const output = [
      'studio-abc _adb-tls-pairing._tcp. local. 192.168.1.44:37185',
      'adb-XYZ _adb-tls-connect._tcp. local. 192.168.1.44:39029',
    ].join('\n')
    const services = parseMdnsServices(output)
    assert.deepEqual(services, [
      { name: 'studio-abc', type: '_adb-tls-pairing._tcp', host: '192.168.1.44', port: 37185 },
      { name: 'adb-XYZ', type: '_adb-tls-connect._tcp', host: '192.168.1.44', port: 39029 },
    ])
  })

  it('strips a trailing dot from a hostname', () => {
    const [service] = parseMdnsServices('adb-XYZ _adb-tls-connect._tcp. local. Pixel-7.local.:39029')
    assert.equal(service.host, 'Pixel-7.local')
  })

  it('ignores the header line and daemon lines', () => {
    const output = ['List of discovered mdns services', '* daemon not running'].join('\n')
    assert.deepEqual(parseMdnsServices(output), [])
  })

  it('ignores lines for other service types', () => {
    assert.deepEqual(parseMdnsServices('My-TV _googlecast._tcp. local. 192.168.1.50:8009'), [])
  })
})

describe('isPairOutputSuccessful', () => {
  it('is true for a successful pairing message', () => {
    assert.equal(isPairOutputSuccessful('Successfully paired to 192.168.1.44:37185 [guid=adb-XYZ]'), true)
  })

  it('is false for a failure message', () => {
    assert.equal(isPairOutputSuccessful('Failed: Wrong password or connection was dropped.'), false)
  })
})

describe('isConnectOutputSuccessful', () => {
  it('is true for a fresh connection', () => {
    assert.equal(isConnectOutputSuccessful('connected to 192.168.1.44:39029'), true)
  })

  it('is true for an already-connected device', () => {
    assert.equal(isConnectOutputSuccessful('already connected to 192.168.1.44:39029'), true)
  })

  it('is false for a failed connection', () => {
    assert.equal(isConnectOutputSuccessful('failed to connect to 192.168.1.44:39029'), false)
  })
})

describe('stripTrailingDot', () => {
  it('removes a trailing dot', () => {
    assert.equal(stripTrailingDot('host.local.'), 'host.local')
  })

  it('trims surrounding whitespace', () => {
    assert.equal(stripTrailingDot(' host '), 'host')
  })
})
