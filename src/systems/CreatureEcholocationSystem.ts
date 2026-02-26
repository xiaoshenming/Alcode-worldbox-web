// Creature Echolocation System (v3.64) - Creatures develop sonar-like sensing
// Echolocation helps navigate darkness, detect hidden enemies, and find resources

import { EntityManager, PositionComponent } from '../ecs/Entity'

export type EchoAbility = 'basic' | 'refined' | 'advanced' | 'master'

export interface EchoPing {
  id: number
  emitterId: number
  range: number
  accuracy: number       // 0-100
  entitiesDetected: number
  resourcesFound: number
  tick: number
}

const CHECK_INTERVAL = 1000
const PING_CHANCE = 0.005
const MAX_PINGS = 80
const SKILL_GROWTH = 0.06

const RANGE_MAP: Record<EchoAbility, number> = {
  basic: 3,
  refined: 6,
  advanced: 10,
  master: 15,
}

const ABILITIES: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']

export class CreatureEcholocationSystem {
  private pings: EchoPing[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.pings.length >= MAX_PINGS) break
      if (Math.random() > PING_CHANCE) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 15)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      // Determine ability level
      const abilityIdx = Math.min(3, Math.floor(skill / 25))
      const ability = ABILITIES[abilityIdx]
      const range = RANGE_MAP[ability]

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      // Count entities in range
      let detected = 0
      for (const other of creatures) {
        if (other === eid) continue
        const oPos = em.getComponent<PositionComponent>(other, 'position')
        if (!oPos) continue
        const dx = oPos.x - pos.x
        const dy = oPos.y - pos.y
        if (dx * dx + dy * dy <= range * range) detected++
      }

      this.pings.push({
        id: this.nextId++,
        emitterId: eid,
        range,
        accuracy: skill,
        entitiesDetected: detected,
        resourcesFound: Math.floor(Math.random() * (range / 2)),
        tick,
      })
    }

    // Cleanup old pings
    const cutoff = tick - 4000
    for (let i = this.pings.length - 1; i >= 0; i--) {
      if (this.pings[i].tick < cutoff) {
        this.pings.splice(i, 1)
      }
    }
  }

  getPings(): readonly EchoPing[] { return this.pings }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
