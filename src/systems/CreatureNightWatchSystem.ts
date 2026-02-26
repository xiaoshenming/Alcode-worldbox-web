// Creature Night Watch System (v3.10) - Creatures take turns guarding at night
// Sentries protect villages from nocturnal threats, gaining vigilance skill

import { EntityManager } from '../ecs/Entity'

export type WatchShift = 'dusk' | 'midnight' | 'dawn'

export interface NightWatch {
  id: number
  sentryId: number
  shift: WatchShift
  vigilance: number    // 0-100
  threatsSpotted: number
  tick: number
}

const CHECK_INTERVAL = 900
const WATCH_CHANCE = 0.03
const MAX_WATCHES = 70

const SHIFT_WEIGHTS: Record<WatchShift, number> = {
  dusk: 0.35, midnight: 0.35, dawn: 0.3,
}
const SHIFTS = Object.keys(SHIFT_WEIGHTS) as WatchShift[]

export class CreatureNightWatchSystem {
  private watches: NightWatch[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.assignWatches(em, tick)
    this.processThreats()
    this.pruneOld()
  }

  private assignWatches(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > WATCH_CHANCE) continue
      const shift = this.pickShift()
      this.watches.push({
        id: this.nextId++,
        sentryId: eid,
        shift,
        vigilance: 20 + Math.random() * 60,
        threatsSpotted: 0,
        tick,
      })
    }
  }

  private pickShift(): WatchShift {
    const r = Math.random()
    let cum = 0
    for (const s of SHIFTS) {
      cum += SHIFT_WEIGHTS[s]
      if (r <= cum) return s
    }
    return 'midnight'
  }

  private processThreats(): void {
    for (const w of this.watches) {
      if (Math.random() < w.vigilance / 500) {
        w.threatsSpotted++
        w.vigilance = Math.min(100, w.vigilance + 2)
      }
    }
  }

  private pruneOld(): void {
    if (this.watches.length > MAX_WATCHES) {
      this.watches.splice(0, this.watches.length - MAX_WATCHES)
    }
  }

  getWatches(): NightWatch[] { return this.watches }
  getRecent(count: number): NightWatch[] {
    return this.watches.slice(-count)
  }
  getTotalThreats(): number {
    return this.watches.reduce((s, w) => s + w.threatsSpotted, 0)
  }
}
