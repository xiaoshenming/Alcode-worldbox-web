// Diplomatic Tribute System (v2.29) - Weaker civs pay tribute to stronger ones
// Tribute prevents war, but drains resources from the weaker civ
// Refusing tribute may trigger invasion

export interface TributeAgreement {
  id: number
  vassalCivId: number
  overlordCivId: number
  tributeRate: number    // percentage of resources 5-30
  startedTick: number
  lastPayment: number
  totalPaid: number
  stability: number      // 0-100, low = likely to rebel
}

const CHECK_INTERVAL = 1000
const PAYMENT_INTERVAL = 600
const MAX_TRIBUTES = 15
const MIN_POP_RATIO = 2.0    // overlord must be 2x population
const BASE_TRIBUTE_RATE = 10
const STABILITY_DECAY = 2
const STABILITY_GAIN = 1

let nextTributeId = 1

export class DiplomaticTributeSystem {
  private tributes: TributeAgreement[] = []
  private lastCheck = 0
  private lastPayment = 0

  update(dt: number, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.checkNewTributes(civManager, tick)
      this.checkRebellions(civManager, tick)
    }
    if (tick - this.lastPayment >= PAYMENT_INTERVAL) {
      this.lastPayment = tick
      this.processPayments(civManager, tick)
    }
  }

  private checkNewTributes(civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.tributes.length >= MAX_TRIBUTES) return
    const civs = [...civManager.civilizations.entries()]
    for (const [idA, civA] of civs) {
      for (const [idB, civB] of civs) {
        if (idA >= idB) continue
        if (this.hasTribute(idA, idB)) continue
        const popA = civA.population ?? 0
        const popB = civB.population ?? 0
        if (popA <= 0 || popB <= 0) continue
        // Check if one is much stronger
        const ratio = popA / popB
        const rel = civA.relations?.get(idB) ?? 0
        if (ratio >= MIN_POP_RATIO && rel < -10 && Math.random() < 0.15) {
          this.tributes.push({
            id: nextTributeId++,
            vassalCivId: idB,
            overlordCivId: idA,
            tributeRate: BASE_TRIBUTE_RATE + Math.floor(Math.random() * 10),
            startedTick: tick,
            lastPayment: tick,
            totalPaid: 0,
            stability: 60 + Math.floor(Math.random() * 30),
          })
        } else if (1 / ratio >= MIN_POP_RATIO && rel < -10 && Math.random() < 0.15) {
          this.tributes.push({
            id: nextTributeId++,
            vassalCivId: idA,
            overlordCivId: idB,
            tributeRate: BASE_TRIBUTE_RATE + Math.floor(Math.random() * 10),
            startedTick: tick,
            lastPayment: tick,
            totalPaid: 0,
            stability: 60 + Math.floor(Math.random() * 30),
          })
        }
        if (this.tributes.length >= MAX_TRIBUTES) return
      }
    }
  }

  private processPayments(civManager: { civilizations: Map<number, any> }, tick: number): void {
    for (const tribute of this.tributes) {
      const vassal = civManager.civilizations.get(tribute.vassalCivId)
      const overlord = civManager.civilizations.get(tribute.overlordCivId)
      if (!vassal || !overlord) continue
      tribute.lastPayment = tick
      tribute.totalPaid += tribute.tributeRate
      // Stability changes
      tribute.stability = Math.max(0, tribute.stability - STABILITY_DECAY)
      // Improve relations slightly
      const rel = vassal.relations?.get(tribute.overlordCivId) ?? 0
      if (vassal.relations) {
        vassal.relations.set(tribute.overlordCivId, Math.min(50, rel + STABILITY_GAIN))
      }
    }
  }

  private checkRebellions(civManager: { civilizations: Map<number, any> }, _tick: number): void {
    this.tributes = this.tributes.filter(t => {
      const vassal = civManager.civilizations.get(t.vassalCivId)
      const overlord = civManager.civilizations.get(t.overlordCivId)
      if (!vassal || !overlord) return false
      // Rebellion check
      if (t.stability <= 10 && Math.random() < 0.3) {
        // Vassal rebels - relations worsen
        if (vassal.relations) {
          vassal.relations.set(t.overlordCivId, -80)
        }
        if (overlord.relations) {
          overlord.relations.set(t.vassalCivId, -80)
        }
        return false
      }
      return true
    })
  }

  private hasTribute(civA: number, civB: number): boolean {
    return this.tributes.some(t =>
      (t.vassalCivId === civA && t.overlordCivId === civB) ||
      (t.vassalCivId === civB && t.overlordCivId === civA)
    )
  }

  getTributes(): TributeAgreement[] {
    return this.tributes
  }

  getTributeFor(civId: number): TributeAgreement | undefined {
    return this.tributes.find(t => t.vassalCivId === civId)
  }

  getTributeCount(): number {
    return this.tributes.length
  }
}
