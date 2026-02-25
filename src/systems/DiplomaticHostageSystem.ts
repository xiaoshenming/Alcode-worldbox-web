// Diplomatic Hostage System (v2.85) - Civilizations exchange hostages to enforce treaties
// Hostages ensure peace; mistreatment triggers wars, good treatment strengthens alliances

import { CivManager } from '../civilization/CivManager'

export type HostageStatus = 'held' | 'released' | 'executed' | 'escaped' | 'ransomed'

export interface Hostage {
  id: number
  name: string
  originCivId: number
  holderCivId: number
  status: HostageStatus
  importance: number     // 1-10, political value
  treatment: number      // 0-100, how well treated
  capturedTick: number
  releaseTick: number | null
}

export interface HostageExchange {
  id: number
  civA: number
  civB: number
  hostageFromA: number
  hostageFromB: number
  establishedTick: number
  active: boolean
}

const CHECK_INTERVAL = 1000
const MAX_HOSTAGES = 20
const EXCHANGE_CHANCE = 0.01
const MISTREAT_WAR_THRESHOLD = 20
const GOOD_TREATMENT_BONUS = 0.5
const ESCAPE_CHANCE = 0.005
const RANSOM_CHANCE = 0.008

const NAMES = [
  'Aldric', 'Brenna', 'Caelum', 'Daria', 'Elowen',
  'Faelan', 'Gisela', 'Hadrian', 'Isolde', 'Jareth',
  'Keira', 'Lysander', 'Miriel', 'Nolan', 'Oriana',
]

let nameIdx = 0

export class DiplomaticHostageSystem {
  private hostages: Hostage[] = []
  private exchanges: HostageExchange[] = []
  private nextId = 1
  private nextExchangeId = 1
  private lastCheck = 0

  update(dt: number, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.initiateExchanges(civManager, tick)
    this.updateHostages(civManager, tick)
    this.checkEscapes(tick)
    this.cleanupExchanges()
  }

  private initiateExchanges(civManager: CivManager, tick: number): void {
    if (this.hostages.length >= MAX_HOSTAGES) return

    const civs = Array.from(civManager.civilizations.values())
    if (civs.length < 2) return

    for (let i = 0; i < civs.length; i++) {
      if (Math.random() > EXCHANGE_CHANCE) continue

      for (let j = i + 1; j < civs.length; j++) {
        // Only exchange between civs not at war (relation > -30)
        const rel = civs[i].relations.get(civs[j].id) ?? 0
        if (rel < -30) continue

        const alreadyExchanging = this.exchanges.some(
          e => e.active && ((e.civA === civs[i].id && e.civB === civs[j].id) ||
                            (e.civA === civs[j].id && e.civB === civs[i].id))
        )
        if (alreadyExchanging) continue

        const hostageA = this.createHostage(civs[i].id, civs[j].id, tick)
        const hostageB = this.createHostage(civs[j].id, civs[i].id, tick)

        this.exchanges.push({
          id: this.nextExchangeId++,
          civA: civs[i].id,
          civB: civs[j].id,
          hostageFromA: hostageA.id,
          hostageFromB: hostageB.id,
          establishedTick: tick,
          active: true,
        })
        break
      }
    }
  }

  private createHostage(originCivId: number, holderCivId: number, tick: number): Hostage {
    const hostage: Hostage = {
      id: this.nextId++,
      name: NAMES[nameIdx % NAMES.length],
      originCivId,
      holderCivId,
      status: 'held',
      importance: 3 + Math.floor(Math.random() * 7),
      treatment: 50 + Math.floor(Math.random() * 30),
      capturedTick: tick,
      releaseTick: null,
    }
    nameIdx++
    this.hostages.push(hostage)
    return hostage
  }

  private updateHostages(civManager: CivManager, tick: number): void {
    for (const hostage of this.hostages) {
      if (hostage.status !== 'held') continue

      hostage.treatment += (Math.random() - 0.45) * 5
      hostage.treatment = Math.max(0, Math.min(100, hostage.treatment))

      // Good treatment improves relations
      if (hostage.treatment > 70) {
        const originCiv = civManager.civilizations.get(hostage.originCivId)
        if (originCiv) {
          const rel = originCiv.relations.get(hostage.holderCivId) ?? 0
          originCiv.relations.set(hostage.holderCivId, Math.min(100, rel + GOOD_TREATMENT_BONUS))
        }
      }

      // Mistreatment worsens relations drastically
      if (hostage.treatment < MISTREAT_WAR_THRESHOLD && Math.random() < 0.05) {
        const originCiv = civManager.civilizations.get(hostage.originCivId)
        if (originCiv) {
          originCiv.relations.set(hostage.holderCivId, -100)
        }
        hostage.status = 'executed'
        hostage.releaseTick = tick
      }

      if (Math.random() < RANSOM_CHANCE && hostage.importance >= 7) {
        hostage.status = 'ransomed'
        hostage.releaseTick = tick
      }
    }
  }

  private checkEscapes(tick: number): void {
    for (const hostage of this.hostages) {
      if (hostage.status !== 'held') continue

      const escapeModifier = hostage.treatment < 30 ? 3 : 1
      if (Math.random() < ESCAPE_CHANCE * escapeModifier) {
        hostage.status = 'escaped'
        hostage.releaseTick = tick
      }
    }
  }

  private cleanupExchanges(): void {
    for (const exchange of this.exchanges) {
      if (!exchange.active) continue

      const hA = this.hostages.find(h => h.id === exchange.hostageFromA)
      const hB = this.hostages.find(h => h.id === exchange.hostageFromB)

      if ((!hA || hA.status !== 'held') && (!hB || hB.status !== 'held')) {
        exchange.active = false
      }
    }

    if (this.hostages.length > 40) {
      const held = this.hostages.filter(h => h.status === 'held')
      const resolved = this.hostages.filter(h => h.status !== 'held')
      resolved.sort((a, b) => (a.releaseTick ?? 0) - (b.releaseTick ?? 0))
      this.hostages = [...held, ...resolved.slice(-10)]
    }
  }

  getHostages(): Hostage[] { return this.hostages }
  getHeldHostages(): Hostage[] { return this.hostages.filter(h => h.status === 'held') }
  getExchanges(): HostageExchange[] { return this.exchanges }
  getActiveExchanges(): HostageExchange[] { return this.exchanges.filter(e => e.active) }
}
