// Creature Superstition System (v2.36) - Creatures develop superstitions
// Lucky/unlucky omens based on world events affect creature behavior
// Superstitions spread within civilizations and persist across generations

import { EntityManager, EntityId, CreatureComponent } from '../ecs/Entity'

export type OmenType = 'lucky_star' | 'blood_moon' | 'rainbow' | 'black_cat' | 'falling_star' | 'eclipse'
export type SuperstitionEffect = 'courage' | 'fear' | 'productivity' | 'laziness' | 'fertility' | 'caution'

export interface Superstition {
  id: number
  civId: number
  omen: OmenType
  effect: SuperstitionEffect
  belief: number         // 0-100 how strongly believed
  origin: number         // tick when formed
  spreadCount: number    // how many creatures believe
}

const CHECK_INTERVAL = 1000
const SPREAD_INTERVAL = 800
const MAX_SUPERSTITIONS = 30
const BELIEF_DECAY = 0.5
const BELIEF_GAIN = 2
const MIN_BELIEF = 5

const OMEN_LIST: OmenType[] = ['lucky_star', 'blood_moon', 'rainbow', 'black_cat', 'falling_star', 'eclipse']
const EFFECT_LIST: SuperstitionEffect[] = ['courage', 'fear', 'productivity', 'laziness', 'fertility', 'caution']

let nextSupId = 1

export class CreatureSuperstitionSystem {
  private superstitions: Superstition[] = []
  private lastCheck = 0
  private lastSpread = 0

  update(dt: number, civIds: number[], tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.generateSuperstitions(civIds, tick)
    }
    if (tick - this.lastSpread >= SPREAD_INTERVAL) {
      this.lastSpread = tick
      this.spreadAndDecay()
    }
  }

  private generateSuperstitions(civIds: number[], tick: number): void {
    if (this.superstitions.length >= MAX_SUPERSTITIONS) return
    for (const civId of civIds) {
      if (Math.random() > 0.05) continue
      if (this.superstitions.filter(s => s.civId === civId).length >= 5) continue
      const omen = OMEN_LIST[Math.floor(Math.random() * OMEN_LIST.length)]
      const effect = EFFECT_LIST[Math.floor(Math.random() * EFFECT_LIST.length)]
      // Don't duplicate same omen for same civ
      if (this.superstitions.some(s => s.civId === civId && s.omen === omen)) continue
      this.superstitions.push({
        id: nextSupId++,
        civId,
        omen,
        effect,
        belief: 30 + Math.floor(Math.random() * 40),
        origin: tick,
        spreadCount: 1 + Math.floor(Math.random() * 5),
      })
      if (this.superstitions.length >= MAX_SUPERSTITIONS) break
    }
  }

  private spreadAndDecay(): void {
    for (const sup of this.superstitions) {
      // Spread within civ
      if (sup.belief > 30 && Math.random() < 0.2) {
        sup.spreadCount = Math.min(50, sup.spreadCount + 1)
        sup.belief = Math.min(100, sup.belief + BELIEF_GAIN)
      }
      // Natural decay
      sup.belief = Math.max(0, sup.belief - BELIEF_DECAY)
    }
    // Remove dead superstitions
    this.superstitions = this.superstitions.filter(s => s.belief >= MIN_BELIEF)
  }

  getSuperstitions(): Superstition[] {
    return this.superstitions
  }

  getSuperstitionsForCiv(civId: number): Superstition[] {
    return this.superstitions.filter(s => s.civId === civId)
  }

  getSuperstitionCount(): number {
    return this.superstitions.length
  }
}
