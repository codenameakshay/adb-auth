import { EventEmitter } from 'node:events'
import type { MdnsService } from '../../shared/types.js'

// Dynamic import to avoid ESM/CJS issues at startup
let Bonjour: any = null

async function getBonjour() {
  if (!Bonjour) {
    const mod = await import('bonjour-service')
    Bonjour = mod.Bonjour || mod.default
  }
  return Bonjour
}

class MdnsDiscoveryService extends EventEmitter {
  private bonjour: any = null
  private browsers: any[] = []
  private discovered: Map<string, MdnsService> = new Map()

  async start(): Promise<void> {
    const BonjourClass = await getBonjour()
    this.bonjour = new BonjourClass()

    const handleService = (service: any, type: string) => {
      const svc: MdnsService = {
        name: service.name,
        host: service.host,
        port: service.port,
        type,
        addresses: service.addresses,
      }
      this.discovered.set(`${type}:${service.name}`, svc)
      this.emit('discovered', Array.from(this.discovered.values()))
    }

    const connectBrowser = this.bonjour.find({ type: 'adb-tls-connect' })
    connectBrowser.on('up', (svc: any) => handleService(svc, '_adb-tls-connect._tcp'))
    connectBrowser.on('down', (svc: any) => {
      this.discovered.delete(`_adb-tls-connect._tcp:${svc.name}`)
      this.emit('discovered', Array.from(this.discovered.values()))
    })

    this.browsers.push(connectBrowser)
  }

  stop(): void {
    for (const b of this.browsers) {
      try { b.stop() } catch { /* ignore */ }
    }
    this.browsers = []
    if (this.bonjour) {
      try { this.bonjour.destroy() } catch { /* ignore */ }
      this.bonjour = null
    }
    this.discovered.clear()
  }

  getDiscovered(): MdnsService[] {
    return Array.from(this.discovered.values())
  }
}

export const mdnsDiscovery = new MdnsDiscoveryService()
