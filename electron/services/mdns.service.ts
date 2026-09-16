import { EventEmitter } from 'node:events'
import { Bonjour, type Browser, type Service } from 'bonjour-service'
import type { MdnsService } from '../../shared/types.js'
import { stripTrailingDot } from './adb.service.js'

class MdnsDiscoveryService extends EventEmitter {
  private bonjour: Bonjour | null = null
  private browsers: Browser[] = []
  private discovered: Map<string, MdnsService> = new Map()

  async start(): Promise<void> {
    this.bonjour = new Bonjour()

    const handleService = (service: Service, type: string) => {
      const svc: MdnsService = {
        name: service.name,
        host: stripTrailingDot(service.host),
        port: service.port,
        type,
      }
      this.discovered.set(`${type}:${service.name}`, svc)
      this.emit('discovered', Array.from(this.discovered.values()))
    }

    const connectBrowser = this.bonjour.find({ type: 'adb-tls-connect' })
    connectBrowser.on('up', (svc: Service) => handleService(svc, '_adb-tls-connect._tcp'))
    connectBrowser.on('down', (svc: Service) => {
      this.discovered.delete(`_adb-tls-connect._tcp:${svc.name}`)
      this.emit('discovered', Array.from(this.discovered.values()))
    })

    this.browsers.push(connectBrowser)
  }
}

export const mdnsDiscovery = new MdnsDiscoveryService()
