// Creature Bard System (v3.99) - Bards perform songs to boost morale
// Different song types provide various effects to nearby creatures

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type SongType = 'war_chant' | 'lullaby' | 'ballad' | 'hymn' | 'dirge'

export interface Performance {
  id: number
  song: SongType
  performer: number
  morale_boost: number
  radius: number
  tick: number
}

const CHECK_INTERVAL = 1400
const PERFORM_CHANCE = 0.004
const MAX_PERFORMANCES = 60
const BASE_RADIUS = 5

const SONG_TYPES: SongType[] = ['war_chant', 'lullaby', 'ballad', 'hymn', 'dirge']
const MORALE_MAP: Record<SongType, number> = {
  war_chant: 15, lullaby: 5, ballad: 10, hymn: 12, dirge: -5,
}

export class CreatureBardSystem {
  private performances: Performance[] = []
  private nextId = 1
  private lastCheck = 0
  private bardSkill = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.performances.length >= MAX_PERFORMANCES) break
      if (Math.random() > PERFORM_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.bardSkill.get(eid) ?? (1 + Math.random() * 5)
      skill = Math.min(100, skill + 0.04)
      this.bardSkill.set(eid, skill)

      const song = SONG_TYPES[Math.floor(Math.random() * SONG_TYPES.length)]
      const boost = MORALE_MAP[song] * (0.5 + skill / 100)

      this.performances.push({
        id: this.nextId++,
        song,
        performer: eid,
        morale_boost: boost,
        radius: BASE_RADIUS + Math.floor(skill / 20),
        tick,
      })
    }

    // Performances fade over time
    const cutoff = tick - 8000
    for (let i = this.performances.length - 1; i >= 0; i--) {
      if (this.performances[i].tick < cutoff) {
        this.performances.splice(i, 1)
      }
    }
  }

}
