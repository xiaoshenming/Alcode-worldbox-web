// Creature Nomad System (v3.129) - Nomadic tribes that migrate across the world
// Nomads follow seasonal patterns and trade with settled civilizations

import { EntityManager } from '../ecs/Entity'

export type NomadTradition = 'herders' | 'gatherers' | 'hunters' | 'traders'

export interface NomadTribe {
  id: number
  leaderId: number
  tradition: NomadTradition
  memberCount: number
  migrationSpeed: number
  tradeGoods: number
  campX: number
  campY: number
  tick: number
}

const CHECK_INTERVAL = 3400
const FORM_CHANCE = 0.002
const MAX_TRIBES = 10

const TRADITIONS: NomadTradition[] = ['herders', 'gatherers', 'hunters', 'traders']
const TRAD_SPEED: Record<NomadTradition, number> = {
  herders: 3, gatherers: 2, hunters: 5, traders: 4,
}

export class CreatureNomadSystem {
  private tribes: NomadTribe[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tribes.length < MAX_TRIBES && Math.random() < FORM_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const tradition = TRADITIONS[Math.floor(Math.random() * TRADITIONS.length)]
        this.tribes.push({
          id: this.nextId++,
          leaderId: eid,
          tradition,
          memberCount: 3 + Math.floor(Math.random() * 8),
          migrationSpeed: TRAD_SPEED[tradition],
          tradeGoods: Math.floor(Math.random() * 30),
          campX: Math.floor(Math.random() * 200),
          campY: Math.floor(Math.random() * 200),
          tick,
        })
      }
    }

    for (const t of this.tribes) {
      // Migrate camp position
      if (Math.random() < 0.01) {
        t.campX = Math.max(0, Math.min(199, t.campX + Math.floor(Math.random() * 7) - 3))
        t.campY = Math.max(0, Math.min(199, t.campY + Math.floor(Math.random() * 7) - 3))
      }
      // Gather trade goods
      if (Math.random() < 0.02) {
        t.tradeGoods = Math.min(100, t.tradeGoods + 2)
      }
      // Population changes
      if (Math.random() < 0.005) {
        t.memberCount = Math.max(1, t.memberCount + (Math.random() < 0.6 ? 1 : -1))
      }
    }

    for (let i = this.tribes.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.tribes[i].leaderId, 'creature')) this.tribes.splice(i, 1)
    }
  }

}
