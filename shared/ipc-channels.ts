export const IPC = {
  // ADB
  ADB_GET_DEVICES:  'adb:get-devices',
  ADB_PAIR:         'adb:pair',
  ADB_CONNECT:      'adb:connect',
  ADB_AUTO_CONNECT: 'adb:auto-connect',
  ADB_DISCONNECT:   'adb:disconnect',
  ADB_GET_PATH:     'adb:get-path',
  ADB_VERIFY_PATH:  'adb:verify-path',
  ADB_KILL_SERVER:  'adb:kill-server',
  ADB_START_SERVER: 'adb:start-server',
  // WiFi
  WIFI_GET_SSID:    'wifi:get-ssid',
  WIFI_GET_IP:      'wifi:get-ip',
  // QR Pairing
  PAIRING_START:    'pairing:start',
  PAIRING_CANCEL:   'pairing:cancel',
  PAIRING_STATUS:   'pairing:status',
  // mDNS discovery
  MDNS_DISCOVERED:  'mdns:discovered',
  // Settings
  SETTINGS_GET:     'settings:get',
  SETTINGS_SET:     'settings:set',
} as const

export type IpcChannel = typeof IPC[keyof typeof IPC]
