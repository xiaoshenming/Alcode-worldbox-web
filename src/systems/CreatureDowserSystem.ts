// Creature Dowser System (v3.141) - Water dowsing abilities for creatures
// Some creatures can sense underground water sources, improving with experience

import { EntityManager } from '../ecs/Entity'

export type DowserTool = 'rod' | 'pendulum' | 'intuition' | 'crystal'

export interface DowserData {
  entityId: number
  waterFound: number
  accuracy: number
  tool: DowserTool
  reputation: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3000
const ASSIGN_CHANCE = 0.002
const MAX_DOWSERS = 8

const TOOLS: DowserTool[] = ['rod', 'pendulum', 'intuition', 'crystal']
const TOOL_BASE_ACCURACY: Record<DowserTool, number> = {
  rod: 40, pendulum: 55, intuition: 25, crystal: 65,
}

export class CreatureDowserSystem {
  private dowsers: DowserData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Assign new dowsers
    if (this.dowsers.length < MAX_DOWSERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.dowsers.some(d => d.entityId === eid)
        if (!already) {
          const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)]
          this.dowsers.push({
            entityId: eid,
            waterFound: 0,
            accuracy: TOOL_BASE_ACCURACY[tool],
            tool,
            reputation: 0,
            active: true,
            tick,
          })
        }
      }
    }

    // Dowsers search for water and gain experience
    for (const d of this.dowsers) {
      if (!d.active) continue
      if (Math.random() < 0.015) {
        const success = Math.random() * 100 < d.accuracy
        if (success) {
          d.waterFound++
          d.accuracy = Math.min(95, d.accuracy + 0.3)
          d.reputation = Math.min(100, d.reputation + 0.5)
        } else {
          d.reputation = Math.max(0, d.reputation - 0.2)
        }
      }
    }

    // Remove dowsers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.dowsers.length - 1; i >= 0; i--) {
      if (!alive.has(this.dowsers[i].entityId)) this.dowsers.splice(i, 1)
    }
  }

  getDowsers(): readonly DowserData[] { return this.dowsers }
}
