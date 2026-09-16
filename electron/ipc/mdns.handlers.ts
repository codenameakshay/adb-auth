import { IPC } from '../../shared/ipc-channels.js'
import { mdnsDiscovery } from '../services/mdns.service.js'
import type { MdnsService } from '../../shared/types.js'
import { broadcast } from './helpers.js'

export function registerMdnsHandlers(): void {
  mdnsDiscovery.on('discovered', (services: MdnsService[]) => {
    broadcast(IPC.MDNS_DISCOVERED, services)
  })

  mdnsDiscovery.start().catch(console.error)
}
