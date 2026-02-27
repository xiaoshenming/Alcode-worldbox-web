// Creature Tattoo System (v3.31) - Creatures get tattoos marking achievements
// Tattoos serve as visual status symbols within civilizations

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type TattooStyle = 'tribal' | 'runic' | 'beast' | 'celestial' | 'war_paint' | 'ancestral'

export interface Tattoo {
  id: number
  entityId: number
  style: TattooStyle
  meaning: string
  prestige: number  // 0-100
  tick: number
}

const CHECK_INTERVAL = 1200
const TATTOO_CHANCE = 0.01
const MAX_TATTOOS = 100

const STYLES: TattooStyle[] = ['tribal', 'runic', 'beast', 'celestial', 'war_paint', 'ancestral']

const MEANINGS: Record<TattooStyle, string> = {
  tribal: 'marks clan membership',
  runic: 'channels magical energy',
  beast: 'honors a slain creature',
  celestial: 'blessed by the gods',
  war_paint: 'veteran of many battles',
  ancestral: 'honors fallen ancestors',
}

export class CreatureTattooSystem {
  private tattoos: Tattoo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.awardTattoos(em, tick)
    this.evolvePrestige()
    this.cleanup()
  }

  private awardTattoos(em: EntityManager, tick: number): void {
    if (this.tattoos.length >= MAX_TATTOOS) return

    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > TATTOO_CHANCE) continue
      if (this.getTattooCount(eid) >= 3) continue
      if (this.tattoos.length >= MAX_TATTOOS) break

      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      let style: TattooStyle
      if (creature.age > creature.maxAge * 0.6) {
        style = 'ancestral'
      } else if (creature.isHostile) {
        style = 'war_paint'
      } else {
        style = STYLES[Math.floor(Math.random() * STYLES.length)]
      }

      this.tattoos.push({
        id: this.nextId++,
        entityId: eid,
        style,
        meaning: MEANINGS[style],
        prestige: 10 + Math.random() * 40,
        tick,
      })
    }
  }

  private evolvePrestige(): void {
    for (const t of this.tattoos) {
      t.prestige = Math.min(100, t.prestige + Math.random() * 0.3)
    }
  }

  private cleanup(): void {
    if (this.tattoos.length > MAX_TATTOOS) {
      this.tattoos.sort((a, b) => b.prestige - a.prestige)
      this.tattoos.length = MAX_TATTOOS
    }
  }

  private _tattoosBuf: Tattoo[] = []
  private getTattooCount(entityId: number): number {
    let n = 0
    for (const t of this.tattoos) { if (t.entityId === entityId) n++ }
    return n
  }

  getTattoos(): Tattoo[] { return this.tattoos }
  getEntityTattoos(entityId: number): Tattoo[] {
    this._tattoosBuf.length = 0
    for (const t of this.tattoos) { if (t.entityId === entityId) this._tattoosBuf.push(t) }
    return this._tattoosBuf
  }
}
