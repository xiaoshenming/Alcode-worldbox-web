// Diplomatic Trade Agreement System (v3.08) - Formal trade agreements between civilizations
// Agreements boost resource flow and improve relations, but can be broken

import { EntityManager } from '../ecs/Entity'

export type AgreementType = 'free_trade' | 'exclusive' | 'resource_swap' | 'tariff_reduction'
export type AgreementStatus = 'active' | 'expired' | 'broken'

export interface TradeAgreement {
  id: number
  civ1: string
  civ2: string
  type: AgreementType
  status: AgreementStatus
  benefit: number      // 0-100
  duration: number
  maxDuration: number
  tick: number
}

const CHECK_INTERVAL = 1200
const AGREE_CHANCE = 0.015
const MAX_AGREEMENTS = 40

const TYPE_WEIGHTS: Record<AgreementType, number> = {
  free_trade: 0.3, exclusive: 0.2,
  resource_swap: 0.3, tariff_reduction: 0.2,
}
const TYPES = Object.keys(TYPE_WEIGHTS) as AgreementType[]

export class DiplomaticTradeAgreementSystem {
  private agreements: TradeAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formAgreements(tick)
    this.evolve()
    this.cleanup()
  }

  private formAgreements(tick: number): void {
    if (this.agreements.length >= MAX_AGREEMENTS) return
    if (Math.random() > AGREE_CHANCE) return

    const civs = ['human', 'elf', 'dwarf', 'orc']
    const c1 = civs[Math.floor(Math.random() * civs.length)]
    let c2 = civs[Math.floor(Math.random() * civs.length)]
    while (c2 === c1) c2 = civs[Math.floor(Math.random() * civs.length)]

    const type = this.pickType()
    this.agreements.push({
      id: this.nextId++,
      civ1: c1, civ2: c2, type,
      status: 'active',
      benefit: 20 + Math.random() * 60,
      duration: 0,
      maxDuration: 3000 + Math.floor(Math.random() * 5000),
      tick,
    })
  }

  private pickType(): AgreementType {
    const r = Math.random()
    let cum = 0
    for (const t of TYPES) { cum += TYPE_WEIGHTS[t]; if (r <= cum) return t }
    return 'free_trade'
  }

  private evolve(): void {
    for (const a of this.agreements) {
      if (a.status !== 'active') continue
      a.duration++
      if (Math.random() < 0.002) { a.status = 'broken'; continue }
      if (a.duration >= a.maxDuration) a.status = 'expired'
    }
  }

  private cleanup(): void {
    let inactiveCount = 0
    for (let _i = 0; _i < this.agreements.length; _i++) {
      if (this.agreements[_i].status !== 'active') inactiveCount++
    }
    if (inactiveCount > 20) {
      // Keep all active + last 20 inactive (from end of array)
      let keptInactive = 0
      for (let _i = this.agreements.length - 1; _i >= 0; _i--) {
        if (this.agreements[_i].status !== 'active') {
          if (keptInactive < 20) { keptInactive++; continue }
          this.agreements.splice(_i, 1)
        }
      }
    }
  }

  getAgreements(): TradeAgreement[] { return this.agreements }
  getActive(): TradeAgreement[] { return this.agreements.filter(a => a.status === 'active') }
}
