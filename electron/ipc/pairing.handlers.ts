import { IPC } from '../../shared/ipc-channels.js'
import type { StartPairingResult, PairingStatus } from '../../shared/types.js'
import { pairingServer } from '../services/pairing-server.service.js'
import { broadcast, handle } from './helpers.js'

export function registerPairingHandlers(): void {
  // Forward pairing status events to renderer
  pairingServer.on('status', (status: PairingStatus) => {
    broadcast(IPC.PAIRING_STATUS, status)
  })

  handle<StartPairingResult>(IPC.PAIRING_START, () => pairingServer.start())

  handle<void>(IPC.PAIRING_CANCEL, () => {
    pairingServer.stop()
  })
}
