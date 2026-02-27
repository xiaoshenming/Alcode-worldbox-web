// Creature Dance System (v2.69) - Ritual dances for celebrations, war preparation, rain summoning
// Creatures gather for ritual dances at various occasions
// Dances provide temporary buffs to participants (morale, combat, fertility)

import { EntityManager, CreatureComponent, PositionComponent } from '../ecs/Entity'

export type DanceType = 'celebration' | 'war' | 'rain' | 'harvest' | 'funeral' | 'mating'

export type DanceEffect = 'morale' | 'combat' | 'fertility' | 'luck' | 'healing' | 'unity'

export interface DanceEvent {
  id: number
  x: number
  y: number
  type: DanceType
  participants: number
  intensity: number       // 0-100
  startTick: number
  duration: number
  effect: DanceEffect
}

const CHECK_INTERVAL = 700
const MAX_DANCES = 15
const SPAWN_CHANCE = 0.04
const GATHER_RADIUS = 8
const MIN_DURATION = 300
const MAX_DURATION = 1200
const INTENSITY_GROWTH = 2
const INTENSITY_DECAY = 3

const DANCE_EFFECTS: Record<DanceType, DanceEffect> = {
  celebration: 'morale',
  war: 'combat',
  rain: 'luck',
  harvest: 'healing',
  funeral: 'unity',
  mating: 'fertility',
}

const ALL_DANCE_TYPES: DanceType[] = ['celebration', 'war', 'rain', 'harvest', 'funeral', 'mating']

export class CreatureDanceSystem {
  private dances: DanceEvent[] = []
  private nextDanceId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Update existing dances
    for (let i = this.dances.length - 1; i >= 0; i--) {
      const dance = this.dances[i]
      const elapsed = tick - dance.startTick

      // Remove expired dances
      if (elapsed >= dance.duration) {
        this.dances.splice(i, 1)
        continue
      }

      // Count nearby creatures as participants
      let nearby = 0
      const entities = em.getAllEntities()
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const creature = em.getComponent<CreatureComponent>(eid, 'creature')
        if (!pos || !creature) continue
        const dx = pos.x - dance.x
        const dy = pos.y - dance.y
        if (dx * dx + dy * dy <= GATHER_RADIUS * GATHER_RADIUS) {
          nearby++
        }
      }

      dance.participants = nearby

      // Intensity grows with participants, decays without
      if (nearby >= 3) {
        dance.intensity = Math.min(100, dance.intensity + INTENSITY_GROWTH * (nearby * 0.2))
      } else {
        dance.intensity = Math.max(0, dance.intensity - INTENSITY_DECAY)
      }

      // End dance early if intensity drops to zero
      if (dance.intensity <= 0) {
        this.dances.splice(i, 1)
      }
    }

    // Try to spawn new dances near creatures
    if (this.dances.length < MAX_DANCES) {
      const entities = em.getAllEntities()
      for (const eid of entities) {
        if (this.dances.length >= MAX_DANCES) break
        if (Math.random() > SPAWN_CHANCE) continue

        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const creature = em.getComponent<CreatureComponent>(eid, 'creature')
        if (!pos || !creature) continue

        // Don't spawn too close to existing dances
        const tooClose = this.dances.some(d => {
          const dx = d.x - pos.x
          const dy = d.y - pos.y
          return dx * dx + dy * dy < GATHER_RADIUS * GATHER_RADIUS * 4
        })
        if (tooClose) continue

        const type = ALL_DANCE_TYPES[Math.floor(Math.random() * ALL_DANCE_TYPES.length)]
        this.dances.push({
          id: this.nextDanceId++,
          x: pos.x,
          y: pos.y,
          type,
          participants: 1,
          intensity: 10 + Math.floor(Math.random() * 20),
          startTick: tick,
          duration: MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION)),
          effect: DANCE_EFFECTS[type],
        })
      }
    }
  }

  private _activeDancesBuf: DanceEvent[] = []
  getDances(): DanceEvent[] { return this.dances }
  getDanceCount(): number { return this.dances.length }
  getActiveDances(): DanceEvent[] {
    this._activeDancesBuf.length = 0
    for (const d of this.dances) { if (d.intensity > 0) this._activeDancesBuf.push(d) }
    return this._activeDancesBuf
  }

  getDanceAt(x: number, y: number): DanceEvent | undefined {
    return this.dances.find(d => {
      const dx = d.x - x
      const dy = d.y - y
      return dx * dx + dy * dy <= GATHER_RADIUS * GATHER_RADIUS
    })
  }
}
