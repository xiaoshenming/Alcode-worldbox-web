// Creature Herbalism System (v3.81) - Creatures learn medicinal plant knowledge
// Herbalists gather herbs, brew remedies, and heal the sick

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type HerbType = 'chamomile' | 'ginseng' | 'lavender' | 'echinacea' | 'valerian' | 'turmeric'
export type RemedyForm = 'poultice' | 'tea' | 'tincture' | 'salve' | 'elixir' | 'incense'

export interface HerbalRemedy {
  id: number
  herbalistId: number
  herb: HerbType
  form: RemedyForm
  potency: number
  healingPower: number
  tick: number
}

const CHECK_INTERVAL = 1000
const GATHER_CHANCE = 0.005
const MAX_REMEDIES = 100
const SKILL_GROWTH = 0.08

const HERBS: HerbType[] = ['chamomile', 'ginseng', 'lavender', 'echinacea', 'valerian', 'turmeric']
const FORMS: RemedyForm[] = ['poultice', 'tea', 'tincture', 'salve', 'elixir', 'incense']

export class CreatureHerbalismSystem {
  private remedies: HerbalRemedy[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.remedies.length >= MAX_REMEDIES) break
      if (Math.random() > GATHER_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const herb = HERBS[Math.floor(Math.random() * HERBS.length)]
      const form = FORMS[Math.floor(Math.random() * FORMS.length)]
      const potency = skill * (0.4 + Math.random() * 0.6)

      this.remedies.push({
        id: this.nextId++,
        herbalistId: eid,
        herb, form, potency,
        healingPower: potency * 0.8 + (herb === 'ginseng' ? 15 : 0),
        tick,
      })
    }

    const cutoff = tick - 45000
    for (let i = this.remedies.length - 1; i >= 0; i--) {
      if (this.remedies[i].tick < cutoff) this.remedies.splice(i, 1)
    }
  }

  getRemedies(): readonly HerbalRemedy[] { return this.remedies }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
