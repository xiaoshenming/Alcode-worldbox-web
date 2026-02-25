// Creature Superstition System (v2.83) - Creatures develop superstitious beliefs based on events
// Positive/negative events near landmarks create superstitions that affect creature behavior

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type SuperstitionType = 'lucky_spot' | 'cursed_ground' | 'sacred_tree' | 'omen_bird' | 'forbidden_path' | 'blessed_water'

export interface Superstition {
  id: number
  type: SuperstitionType
  x: number
  y: number
  radius: number
  strength: number      // 0-100, how strongly believed
  originTick: number
  believers: Set<number>
  positive: boolean      // lucky vs cursed
  decayRate: number
}

const CHECK_INTERVAL = 800
const MAX_SUPERSTITIONS = 20
const FORM_CHANCE = 0.015
const BELIEF_SPREAD_RANGE = 8
const MIN_STRENGTH = 5
const MAX_STRENGTH = 100
const DECAY_BASE = 0.3

const TYPE_CONFIG: Record<SuperstitionType, { positive: boolean; radius: number }> = {
  lucky_spot: { positive: true, radius: 3 },
  cursed_ground: { positive: false, radius: 4 },
  sacred_tree: { positive: true, radius: 5 },
  omen_bird: { positive: false, radius: 3 },
  forbidden_path: { positive: false, radius: 6 },
  blessed_water: { positive: true, radius: 4 },
}

const TYPES = Object.keys(TYPE_CONFIG) as SuperstitionType[]

export class CreatureSuperstitionSystem {
  private superstitions: Superstition[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formSuperstitions(em, tick)
    this.spreadBeliefs(em)
    this.decaySuperstitions()
    this.cleanup()
  }

  private formSuperstitions(em: EntityManager, tick: number): void {
    if (this.superstitions.length >= MAX_SUPERSTITIONS) return
    if (Math.random() > FORM_CHANCE) return

    const entities = em.getEntitiesWithComponents('position', 'creature')
    if (entities.length === 0) return

    const idx = Math.floor(Math.random() * entities.length)
    const eid = entities[idx]
    const pos = em.getComponent<PositionComponent>(eid, 'position')
    if (!pos) return

    const tooClose = this.superstitions.some(s => {
      const dx = s.x - pos.x
      const dy = s.y - pos.y
      return dx * dx + dy * dy < 64
    })
    if (tooClose) return

    const type = TYPES[Math.floor(Math.random() * TYPES.length)]
    const config = TYPE_CONFIG[type]

    this.superstitions.push({
      id: this.nextId++,
      type,
      x: pos.x,
      y: pos.y,
      radius: config.radius,
      strength: 30 + Math.random() * 40,
      originTick: tick,
      believers: new Set([eid]),
      positive: config.positive,
      decayRate: DECAY_BASE + Math.random() * 0.2,
    })
  }

  private spreadBeliefs(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const sup of this.superstitions) {
      for (const eid of entities) {
        if (sup.believers.has(eid)) continue
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = sup.x - pos.x
        const dy = sup.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > BELIEF_SPREAD_RANGE) continue

        const adoptChance = (sup.strength / MAX_STRENGTH) * (1 - dist / BELIEF_SPREAD_RANGE) * 0.1
        if (Math.random() < adoptChance) {
          sup.believers.add(eid)
          sup.strength = Math.min(MAX_STRENGTH, sup.strength + 2)
        }
      }
    }
  }

  private decaySuperstitions(): void {
    for (const sup of this.superstitions) {
      const believerFactor = Math.max(0.3, 1 - sup.believers.size * 0.05)
      sup.strength -= sup.decayRate * believerFactor
    }
  }

  private cleanup(): void {
    for (let i = this.superstitions.length - 1; i >= 0; i--) {
      if (this.superstitions[i].strength < MIN_STRENGTH) {
        this.superstitions.splice(i, 1)
      }
    }
  }

  getSuperstitions(): Superstition[] { return this.superstitions }
  getPositiveSuperstitions(): Superstition[] { return this.superstitions.filter(s => s.positive) }
  getNegativeSuperstitions(): Superstition[] { return this.superstitions.filter(s => !s.positive) }
}
