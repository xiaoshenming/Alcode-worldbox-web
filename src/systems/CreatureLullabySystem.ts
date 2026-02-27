// Creature Lullaby System (v3.51) - Adult creatures sing lullabies to calm young ones
// Lullabies reduce stress in nearby young creatures and strengthen social bonds

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export interface Lullaby {
  id: number
  singerId: number
  targetId: number
  melody: string
  soothingPower: number  // 0-100
  bondsFormed: number
  tick: number
}

const CHECK_INTERVAL = 1100
const SING_CHANCE = 0.006
const MAX_LULLABIES = 80
const SOOTHING_DECAY = 0.3

const MELODIES = ['gentle hum', 'soft whistle', 'rhythmic chant', 'nature song', 'ancestral tune', 'starlight melody']

export class CreatureLullabySystem {
  private lullabies: Lullaby[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')
    if (creatures.length < 2) return

    // Adults sing to young creatures
    for (const eid of creatures) {
      if (this.lullabies.length >= MAX_LULLABIES) break
      if (Math.random() > SING_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 20) continue  // must be adult

      // Find a young creature nearby
      const target = creatures.find(tid => {
        if (tid === eid) return false
        const tc = em.getComponent<CreatureComponent>(tid, 'creature')
        return tc && tc.age < 15
      })

      if (target) {
        this.lullabies.push({
          id: this.nextId++,
          singerId: eid,
          targetId: target,
          melody: MELODIES[Math.floor(Math.random() * MELODIES.length)],
          soothingPower: 40 + Math.random() * 50,
          bondsFormed: 0,
          tick,
        })
      }
    }

    // Update lullabies
    for (const lull of this.lullabies) {
      lull.soothingPower -= SOOTHING_DECAY
      if (lull.soothingPower > 30) {
        lull.bondsFormed++
      }
    }

    // Clean up faded lullabies
    for (let _i = this.lullabies.length - 1; _i >= 0; _i--) { if (this.lullabies[_i].soothingPower <= 5) this.lullabies.splice(_i, 1) }
  }

  getLullabies(): Lullaby[] {
    return this.lullabies
  }

  private _singerBuf: Lullaby[] = []
  getBySinger(entityId: number): Lullaby[] {
    this._singerBuf.length = 0
    for (const l of this.lullabies) { if (l.singerId === entityId) this._singerBuf.push(l) }
    return this._singerBuf
  }
}
