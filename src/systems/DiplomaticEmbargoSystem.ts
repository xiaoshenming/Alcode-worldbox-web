// Diplomatic Embargo System (v2.98) - Civilizations impose trade embargoes
// Embargoes block resource flow between nations, causing economic pressure

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EmbargoSeverity = 'partial' | 'full' | 'blockade'

export interface Embargo {
  id: number
  imposerCiv: string
  targetCiv: string
  severity: EmbargoSeverity
  reason: string
  duration: number
  maxDuration: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 1200
const EMBARGO_CHANCE = 0.015
const MAX_EMBARGOES = 30

const EMBARGO_REASONS = [
  'territorial_dispute',
  'trade_imbalance',
  'war_declaration',
  'espionage_discovered',
  'treaty_violation',
  'resource_competition',
] as const

const SEVERITY_WEIGHTS: Record<EmbargoSeverity, number> = {
  partial: 0.5,
  full: 0.35,
  blockade: 0.15,
}

export class DiplomaticEmbargoSystem {
  private embargoes: Embargo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateEmbargoes(tick)
    this.evolveEmbargoes()
    this.cleanup()
  }

  private generateEmbargoes(tick: number): void {
    if (this.embargoes.length >= MAX_EMBARGOES) return
    if (Math.random() > EMBARGO_CHANCE) return

    const civs = ['human', 'elf', 'dwarf', 'orc']
    const imposer = civs[Math.floor(Math.random() * civs.length)]
    let target = civs[Math.floor(Math.random() * civs.length)]
    while (target === imposer) {
      target = civs[Math.floor(Math.random() * civs.length)]
    }

    const reason = EMBARGO_REASONS[Math.floor(Math.random() * EMBARGO_REASONS.length)]
    const severity = this.pickSeverity()

    this.embargoes.push({
      id: this.nextId++,
      imposerCiv: imposer,
      targetCiv: target,
      severity,
      reason,
      duration: 0,
      maxDuration: 3000 + Math.floor(Math.random() * 5000),
      active: true,
      tick,
    })
  }

  private pickSeverity(): EmbargoSeverity {
    const r = Math.random()
    let cum = 0
    for (const [sev, w] of Object.entries(SEVERITY_WEIGHTS)) {
      cum += w
      if (r <= cum) return sev as EmbargoSeverity
    }
    return 'partial'
  }

  private evolveEmbargoes(): void {
    for (const emb of this.embargoes) {
      emb.duration++
      if (emb.duration >= emb.maxDuration) {
        emb.active = false
      }
    }
  }

  private cleanup(): void {
    for (let i = this.embargoes.length - 1; i >= 0; i--) {
      if (!this.embargoes[i].active) {
        this.embargoes.splice(i, 1)
      }
    }
  }

  getEmbargoes(): Embargo[] { return this.embargoes }
  getActiveEmbargoes(): Embargo[] { return this.embargoes.filter(e => e.active) }
  isEmbargoed(civ1: string, civ2: string): boolean {
    return this.embargoes.some(e =>
      e.active && ((e.imposerCiv === civ1 && e.targetCiv === civ2) ||
                   (e.imposerCiv === civ2 && e.targetCiv === civ1))
    )
  }
}
