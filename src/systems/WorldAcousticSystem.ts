// World Acoustic System (v2.55) - Sound propagation in the world
// Sounds from battles, construction, and nature affect creature behavior
// Loud areas cause stress, quiet areas promote rest and healing

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export type SoundType = 'battle' | 'construction' | 'nature' | 'music' | 'thunder' | 'eruption'

export interface SoundSource {
  id: number
  x: number
  y: number
  type: SoundType
  volume: number        // 0-100
  radius: number
  startedAt: number
  duration: number
}

const CHECK_INTERVAL = 700
const EFFECT_INTERVAL = 500
const MAX_SOUNDS = 50
const SOUND_DECAY = 5

const SOUND_STRESS: Record<SoundType, number> = {
  battle: 15,
  construction: 5,
  nature: -10,
  music: -15,
  thunder: 8,
  eruption: 20,
}

let nextSoundId = 1

export class WorldAcousticSystem {
  private sounds: SoundSource[] = []
  private lastCheck = 0
  private lastEffect = 0
  private worldWidth = 0
  private worldHeight = 0

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.detectSounds(em, tick)
    }
    if (tick - this.lastEffect >= EFFECT_INTERVAL) {
      this.lastEffect = tick
      this.applySoundEffects(em, tick)
    }
  }

  private detectSounds(em: EntityManager, tick: number): void {
    // Remove expired sounds
    this.sounds = this.sounds.filter(s => tick - s.startedAt < s.duration)
    if (this.sounds.length >= MAX_SOUNDS) return

    // Detect battle sounds from fighting creatures
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      if (Math.random() > 0.03) continue
      const creature = em.getComponent<any>(id, 'creature')
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!creature || !pos) continue

      let type: SoundType
      if (creature.state === 'fighting' || creature.state === 'attacking') {
        type = 'battle'
      } else if (creature.state === 'building') {
        type = 'construction'
      } else {
        type = Math.random() < 0.5 ? 'nature' : 'music'
      }

      // Avoid duplicate sounds in same area
      const nearby = this.sounds.some(s => {
        const dx = s.x - pos.x, dy = s.y - pos.y
        return dx * dx + dy * dy < 64
      })
      if (nearby) continue

      this.sounds.push({
        id: nextSoundId++,
        x: pos.x,
        y: pos.y,
        type,
        volume: 40 + Math.floor(Math.random() * 60),
        radius: 5 + Math.floor(Math.random() * 10),
        startedAt: tick,
        duration: 800 + Math.floor(Math.random() * 1200),
      })
      if (this.sounds.length >= MAX_SOUNDS) break
    }
  }

  private applySoundEffects(em: EntityManager, tick: number): void {
    if (this.sounds.length === 0) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      if (Math.random() > 0.1) continue
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const creature = em.getComponent<any>(id, 'creature')
      if (!pos || !creature) continue

      let totalStress = 0
      for (const sound of this.sounds) {
        const dx = pos.x - sound.x, dy = pos.y - sound.y
        const distSq = dx * dx + dy * dy
        if (distSq > sound.radius * sound.radius) continue
        const dist = Math.sqrt(distSq)
        const falloff = 1 - dist / sound.radius
        totalStress += SOUND_STRESS[sound.type] * falloff * (sound.volume / 100)
      }

      if (totalStress !== 0 && creature.mood != null) {
        creature.mood = Math.max(0, Math.min(100, creature.mood - totalStress * 0.1))
      }
    }

    // Decay sound volumes
    for (const sound of this.sounds) {
      sound.volume = Math.max(0, sound.volume - SOUND_DECAY)
    }
  }

  getSounds(): SoundSource[] { return this.sounds }
  getActiveSounds(): SoundSource[] { return this.sounds.filter(s => s.volume > 0) }
  getLoudestArea(): { x: number; y: number; volume: number } | null {
    if (this.sounds.length === 0) return null
    const loudest = this.sounds.reduce((a, b) => a.volume > b.volume ? a : b)
    return { x: loudest.x, y: loudest.y, volume: loudest.volume }
  }
}
