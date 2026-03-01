// Diplomatic Propaganda System (v3.23) - Civilizations spread propaganda
// Propaganda influences other civs' loyalty and can destabilize enemies

import { EntityManager } from '../ecs/Entity'

export type PropagandaMessage = 'glory' | 'fear' | 'prosperity' | 'liberation' | 'unity' | 'divine'

export interface Propaganda {
  id: number
  sourceCivId: number
  targetCivId: number
  message: PropagandaMessage
  effectiveness: number  // 0-100
  tick: number
}

const CHECK_INTERVAL = 900
const PROPAGANDA_CHANCE = 0.01
const MAX_PROPAGANDA = 40
const DECAY_RATE = 0.3

const MESSAGES: PropagandaMessage[] = ['glory', 'fear', 'prosperity', 'liberation', 'unity', 'divine']

export class DiplomaticPropagandaSystem {
  private propaganda: Propaganda[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generatePropaganda(tick)
    this.evolveEffectiveness()
    this.cleanup()
  }

  private generatePropaganda(tick: number): void {
    if (this.propaganda.length >= MAX_PROPAGANDA) return
    if (Math.random() > PROPAGANDA_CHANCE) return

    // Generate propaganda between random civ pairs
    const sourceCivId = 1 + Math.floor(Math.random() * 10)
    let targetCivId = 1 + Math.floor(Math.random() * 10)
    while (targetCivId === sourceCivId) {
      targetCivId = 1 + Math.floor(Math.random() * 10)
    }

    // Check if this pair already has active propaganda
    if (this.hasPropaganda(sourceCivId, targetCivId)) return

    const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

    this.propaganda.push({
      id: this.nextId++,
      sourceCivId,
      targetCivId,
      message,
      effectiveness: 10 + Math.random() * 40,
      tick,
    })
  }

  private evolveEffectiveness(): void {
    for (const p of this.propaganda) {
      // Effectiveness grows then decays
      if (p.effectiveness < 70) {
        p.effectiveness = Math.min(100, p.effectiveness + Math.random() * 2)
      } else {
        p.effectiveness = Math.max(0, p.effectiveness - DECAY_RATE)
      }
    }
  }

  private cleanup(): void {
    // Remove ineffective propaganda
    for (let _i = this.propaganda.length - 1; _i >= 0; _i--) { if (this.propaganda[_i].effectiveness <= 1) this.propaganda.splice(_i, 1) }
    if (this.propaganda.length > MAX_PROPAGANDA) {
      this.propaganda.sort((a, b) => b.effectiveness - a.effectiveness)
      this.propaganda.length = MAX_PROPAGANDA
    }
  }

  private hasPropaganda(source: number, target: number): boolean {
    return this.propaganda.some(p => p.sourceCivId === source && p.targetCivId === target)
  }

  private _propagandaBuf: Propaganda[] = []
  getPropagandaCount(): number { return this.propaganda.length }
}
