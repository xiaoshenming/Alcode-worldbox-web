// Creature Puppeteer System (v3.121) - Puppet shows for entertainment and culture
// Puppeteers perform shows that boost settlement morale and cultural output

import { EntityManager } from '../ecs/Entity'

export type PuppetStyle = 'shadow' | 'marionette' | 'hand' | 'rod'

export interface Puppeteer {
  id: number
  creatureId: number
  style: PuppetStyle
  skill: number
  showsPerformed: number
  moraleBoost: number
  fame: number
  tick: number
}

const CHECK_INTERVAL = 3000
const RECRUIT_CHANCE = 0.003
const MAX_PUPPETEERS = 18

const STYLES: PuppetStyle[] = ['shadow', 'marionette', 'hand', 'rod']
const STYLE_MORALE: Record<PuppetStyle, number> = {
  shadow: 8, marionette: 12, hand: 5, rod: 10,
}

export class CreaturePuppeteerSystem {
  private puppeteers: Puppeteer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.puppeteers.length < MAX_PUPPETEERS && Math.random() < RECRUIT_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const style = STYLES[Math.floor(Math.random() * STYLES.length)]
        this.puppeteers.push({
          id: this.nextId++,
          creatureId: eid,
          style,
          skill: 10 + Math.floor(Math.random() * 30),
          showsPerformed: 0,
          moraleBoost: STYLE_MORALE[style],
          fame: 0,
          tick,
        })
      }
    }

    for (const p of this.puppeteers) {
      if (Math.random() < 0.015) {
        p.showsPerformed++
        p.skill = Math.min(100, p.skill + 0.3)
        p.fame = Math.min(100, p.fame + 0.2)
      }
    }

    for (let i = this.puppeteers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.puppeteers[i].creatureId, 'creature')) this.puppeteers.splice(i, 1)
    }
  }

  getPuppeteers(): readonly Puppeteer[] { return this.puppeteers }
}
