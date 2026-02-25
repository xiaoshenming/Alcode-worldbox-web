// Creature Phobia System (v2.61) - Fears and phobias
// Creatures develop phobias from traumatic events (fire, combat, water)
// Phobias affect behavior: avoidance, panic, reduced combat effectiveness

import { EntityManager, CreatureComponent, PositionComponent } from '../ecs/Entity'

export type PhobiaType = 'fire' | 'water' | 'darkness' | 'heights' | 'crowds' | 'beasts' | 'magic' | 'death'

export interface Phobia {
  type: PhobiaType
  severity: number    // 0-100
  origin: string      // what caused it
  acquiredTick: number
}

export interface CreaturePhobiaData {
  entityId: number
  phobias: Phobia[]
  panicLevel: number  // 0-100
  lastPanicTick: number
}

const CHECK_INTERVAL = 800
const MAX_PHOBIAS_PER_CREATURE = 3
const PANIC_DECAY = 2
const PHOBIA_DECAY = 0.05

const PHOBIA_TRIGGERS: Record<PhobiaType, string> = {
  fire: 'near lava or fire',
  water: 'nearly drowned',
  darkness: 'attacked at night',
  heights: 'fell from mountain',
  crowds: 'overwhelmed in battle',
  beasts: 'attacked by animal',
  magic: 'hit by magic storm',
  death: 'witnessed ally death',
}

const ALL_PHOBIAS: PhobiaType[] = ['fire', 'water', 'darkness', 'heights', 'crowds', 'beasts', 'magic', 'death']

export class CreaturePhobiaSystem {
  private phobiaData: Map<number, CreaturePhobiaData> = new Map()
  private lastCheck = 0
  private totalPhobias = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const entities = em.getAllEntities()
    for (const eid of entities) {
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      let data = this.phobiaData.get(eid)
      if (!data) {
        // Small chance to develop a phobia each check
        if (Math.random() < 0.02) {
          const phobiaType = ALL_PHOBIAS[Math.floor(Math.random() * ALL_PHOBIAS.length)]
          data = {
            entityId: eid,
            phobias: [{
              type: phobiaType,
              severity: 15 + Math.floor(Math.random() * 40),
              origin: PHOBIA_TRIGGERS[phobiaType],
              acquiredTick: tick,
            }],
            panicLevel: 0,
            lastPanicTick: 0,
          }
          this.phobiaData.set(eid, data)
          this.totalPhobias++
        }
        continue
      }

      // Decay panic
      if (data.panicLevel > 0) {
        data.panicLevel = Math.max(0, data.panicLevel - PANIC_DECAY)
      }

      // Decay phobia severity over time
      for (let i = data.phobias.length - 1; i >= 0; i--) {
        data.phobias[i].severity -= PHOBIA_DECAY
        if (data.phobias[i].severity <= 0) {
          data.phobias.splice(i, 1)
          this.totalPhobias--
        }
      }

      // Chance to trigger panic from existing phobias
      if (data.phobias.length > 0 && Math.random() < 0.05) {
        const worst = data.phobias.reduce((a, b) => a.severity > b.severity ? a : b)
        data.panicLevel = Math.min(100, data.panicLevel + worst.severity * 0.3)
        data.lastPanicTick = tick
      }

      // Chance to develop new phobia
      if (data.phobias.length < MAX_PHOBIAS_PER_CREATURE && Math.random() < 0.005) {
        const existing = new Set(data.phobias.map(p => p.type))
        const available = ALL_PHOBIAS.filter(p => !existing.has(p))
        if (available.length > 0) {
          const newType = available[Math.floor(Math.random() * available.length)]
          data.phobias.push({
            type: newType,
            severity: 10 + Math.floor(Math.random() * 30),
            origin: PHOBIA_TRIGGERS[newType],
            acquiredTick: tick,
          })
          this.totalPhobias++
        }
      }

      // Clean up dead entities
      if (!em.getComponent<PositionComponent>(eid, 'position')) {
        for (const p of data.phobias) this.totalPhobias--
        this.phobiaData.delete(eid)
      }
    }
  }

  getPhobias(entityId: number): Phobia[] {
    return this.phobiaData.get(entityId)?.phobias ?? []
  }

  getPanicLevel(entityId: number): number {
    return this.phobiaData.get(entityId)?.panicLevel ?? 0
  }

  getTotalPhobias(): number { return this.totalPhobias }
  getAffectedCount(): number { return this.phobiaData.size }
}
