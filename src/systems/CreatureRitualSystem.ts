// Creature Ritual System (v3.16) - Creatures hold rituals at special moments
// Rain dances, harvest feasts, war cries, healing circles affect morale and luck

import { EntityManager, CreatureComponent, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type RitualType = 'rain_dance' | 'harvest_feast' | 'war_cry' | 'healing_circle' | 'moon_prayer' | 'ancestor_worship'
export type RitualEffect = 'morale_boost' | 'luck' | 'strength' | 'healing' | 'fertility' | 'protection'

export interface Ritual {
  id: number
  leaderId: number
  participants: number[]
  type: RitualType
  progress: number    // 0-100
  effect: RitualEffect
  tick: number
}

const CHECK_INTERVAL = 800
const RITUAL_CHANCE = 0.012
const MAX_RITUALS = 40
const PROGRESS_PER_TICK = 8

const RITUAL_TYPES: RitualType[] = [
  'rain_dance', 'harvest_feast', 'war_cry', 'healing_circle', 'moon_prayer', 'ancestor_worship',
]

const TYPE_EFFECT_MAP: Record<RitualType, RitualEffect> = {
  rain_dance: 'fertility',
  harvest_feast: 'morale_boost',
  war_cry: 'strength',
  healing_circle: 'healing',
  moon_prayer: 'luck',
  ancestor_worship: 'protection',
}

export class CreatureRitualSystem {
  private rituals: Ritual[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.initiateRituals(em, tick)
    this.progressRituals(em)
    this.pruneCompleted()
  }

  private initiateRituals(em: EntityManager, tick: number): void {
    if (this.rituals.length >= MAX_RITUALS) return
    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > RITUAL_CHANCE) continue
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!creature || !needs || needs.health <= 0) continue

      const type = RITUAL_TYPES[Math.floor(Math.random() * RITUAL_TYPES.length)]
      const nearby = this.findNearbyCreatures(em, eid, 8)
      if (nearby.length < 2) continue

      const participants: number[] = [eid]
      const maxPart = Math.min(5, nearby.length)
      for (let pi = 0; pi < maxPart; pi++) participants.push(nearby[pi])

      this.rituals.push({
        id: this.nextId++,
        leaderId: eid,
        participants,
        type,
        progress: 0,
        effect: TYPE_EFFECT_MAP[type],
        tick,
      })
      if (this.rituals.length >= MAX_RITUALS) return
    }
  }

  private findNearbyCreatures(em: EntityManager, eid: number, radius: number): number[] {
    const pos = em.getComponent<PositionComponent>(eid, 'position')
    if (!pos) return []
    const result: number[] = []
    const entities = em.getEntitiesWithComponents('creature', 'position')
    for (const other of entities) {
      if (other === eid) continue
      const oPos = em.getComponent<PositionComponent>(other, 'position')
      if (!oPos) continue
      const dx = oPos.x - pos.x
      const dy = oPos.y - pos.y
      if (dx * dx + dy * dy <= radius * radius) {
        result.push(other)
        if (result.length >= 6) break
      }
    }
    return result
  }

  private progressRituals(em: EntityManager): void {
    for (const ritual of this.rituals) {
      if (ritual.progress >= 100) continue
      // Check leader still alive
      const leaderNeeds = em.getComponent<NeedsComponent>(ritual.leaderId, 'needs')
      if (!leaderNeeds || leaderNeeds.health <= 0) {
        ritual.progress = 100
        continue
      }
      for (let _pi = ritual.participants.length - 1; _pi >= 0; _pi--) {
        const n = em.getComponent<NeedsComponent>(ritual.participants[_pi], 'needs')
        if (!n || n.health <= 0) ritual.participants.splice(_pi, 1)
      }
      if (ritual.participants.length < 2) {
        ritual.progress = 100
        continue
      }
      ritual.progress = Math.min(100, ritual.progress + PROGRESS_PER_TICK + Math.floor(Math.random() * 4))
    }
  }

  private pruneCompleted(): void {
    if (this.rituals.length <= MAX_RITUALS) return
    for (let _i = this.rituals.length - 1; _i >= 0; _i--) { if (!((r) => r.progress < 100)(this.rituals[_i])) this.rituals.splice(_i, 1) }
    if (this.rituals.length > MAX_RITUALS) {
      this.rituals.splice(0, this.rituals.length - MAX_RITUALS)
    }
  }

  private _activeRitualsBuf: Ritual[] = []
  private _typeRitualsBuf: Ritual[] = []
  getRituals(): Ritual[] { return this.rituals }
  getActiveRituals(): Ritual[] {
    this._activeRitualsBuf.length = 0
    for (const r of this.rituals) { if (r.progress < 100) this._activeRitualsBuf.push(r) }
    return this._activeRitualsBuf
  }
  getRitualsByType(type: RitualType): Ritual[] {
    this._typeRitualsBuf.length = 0
    for (const r of this.rituals) { if (r.type === type) this._typeRitualsBuf.push(r) }
    return this._typeRitualsBuf
  }
}
