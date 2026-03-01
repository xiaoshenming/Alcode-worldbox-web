// Creature Tattoist System (v3.117) - Tattoo artists mark creatures with symbolic ink
// Tattoos grant minor stat bonuses and cultural prestige

import { EntityManager } from '../ecs/Entity'

export type TattooStyle = 'tribal' | 'runic' | 'celestial' | 'beast'

export interface Tattoo {
  id: number
  creatureId: number
  style: TattooStyle
  bodyPart: string
  powerBonus: number
  prestige: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 3200
const TATTOO_CHANCE = 0.004
const MAX_TATTOOS = 40

const STYLES: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
const BODY_PARTS = ['arm', 'back', 'chest', 'face', 'leg']
const STYLE_BONUS: Record<TattooStyle, number> = {
  tribal: 3, runic: 7, celestial: 12, beast: 5,
}

export class CreatureTattoistSystem {
  private tattoos: Tattoo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Apply tattoos to random creatures
    if (this.tattoos.length < MAX_TATTOOS && Math.random() < TATTOO_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const style = STYLES[Math.floor(Math.random() * STYLES.length)]
        const bodyPart = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)]
        this.tattoos.push({
          id: this.nextId++,
          creatureId: eid,
          style,
          bodyPart,
          powerBonus: STYLE_BONUS[style],
          prestige: Math.floor(Math.random() * 20) + 5,
          age: 0,
          tick,
        })
      }
    }

    // Update tattoo age
    for (const t of this.tattoos) {
      t.age = tick - t.tick
      // Prestige grows with age (respected elders)
      if (t.age > 50000) {
        t.prestige = Math.min(100, t.prestige + 0.02)
      }
    }

    // Remove tattoos of dead creatures
    for (let i = this.tattoos.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.tattoos[i].creatureId, 'creature')) this.tattoos.splice(i, 1)
    }
  }

}
