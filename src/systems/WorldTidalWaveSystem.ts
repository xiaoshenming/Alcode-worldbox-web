// World Tidal Wave System (v3.40) - Massive waves crash onto coastlines
// Tidal waves damage coastal structures and push creatures inland

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'

export type WaveIntensity = 'minor' | 'moderate' | 'major' | 'tsunami'

export interface TidalWave {
  id: number
  originX: number
  originY: number
  direction: number   // radians
  intensity: WaveIntensity
  reach: number       // how far inland
  progress: number    // 0-100 wave progress
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1500
const WAVE_CHANCE = 0.003
const MAX_WAVES = 3
const PUSH_FORCE = 0.5

const DAMAGE_MAP: Record<WaveIntensity, number> = {
  minor: 0.1,
  moderate: 0.3,
  major: 0.6,
  tsunami: 1.2,
}

const REACH_MAP: Record<WaveIntensity, number> = {
  minor: 5,
  moderate: 10,
  major: 18,
  tsunami: 30,
}

export class WorldTidalWaveSystem {
  private waves: TidalWave[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnWave(world, tick)
      this.expireWaves(tick)
    }

    this.progressWaves()
    if (this.waves.length > 0) {
      this.applyEffects(em)
    }
  }

  private trySpawnWave(world: any, tick: number): void {
    if (this.waves.length >= MAX_WAVES) return
    if (Math.random() > WAVE_CHANCE) return

    const width = world.width || 200
    const height = world.height || 200

    // Spawn from edges (coastlines)
    const edge = Math.floor(Math.random() * 4)
    let originX: number, originY: number, direction: number
    switch (edge) {
      case 0: originX = 0; originY = Math.random() * height; direction = 0; break
      case 1: originX = width; originY = Math.random() * height; direction = Math.PI; break
      case 2: originX = Math.random() * width; originY = 0; direction = Math.PI / 2; break
      default: originX = Math.random() * width; originY = height; direction = -Math.PI / 2; break
    }

    const roll = Math.random()
    const intensity: WaveIntensity = roll < 0.4 ? 'minor' : roll < 0.7 ? 'moderate' : roll < 0.9 ? 'major' : 'tsunami'

    this.waves.push({
      id: this.nextId++,
      originX, originY,
      direction,
      intensity,
      reach: REACH_MAP[intensity],
      progress: 0,
      startTick: tick,
      duration: 800 + Math.floor(Math.random() * 1200),
    })
  }

  private progressWaves(): void {
    for (const w of this.waves) {
      w.progress = Math.min(100, w.progress + 0.5)
    }
  }

  private expireWaves(tick: number): void {
    for (let _i = this.waves.length - 1; _i >= 0; _i--) { if (!((w) => tick - w.startTick < w.duration)(this.waves[_i])) this.waves.splice(_i, 1) }
  }

  private applyEffects(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const w of this.waves) {
        // Calculate wave front position
        const waveFrontX = w.originX + Math.cos(w.direction) * w.reach * (w.progress * 0.01)
        const waveFrontY = w.originY + Math.sin(w.direction) * w.reach * (w.progress * 0.01)

        const dx = pos.x - waveFrontX
        const dy = pos.y - waveFrontY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < w.reach * 0.3) {
          // Damage and push
          const dmg = DAMAGE_MAP[w.intensity]
          if (needs.health > 5) {
            needs.health -= dmg
          }
          // Push creature in wave direction
          pos.x += Math.cos(w.direction) * PUSH_FORCE
          pos.y += Math.sin(w.direction) * PUSH_FORCE
        }
      }
    }
  }

  getWaves(): TidalWave[] { return this.waves }
  isWaveActive(): boolean { return this.waves.length > 0 }
  getStrongestWave(): TidalWave | undefined {
    return [...this.waves].sort((a, b) => DAMAGE_MAP[b.intensity] - DAMAGE_MAP[a.intensity])[0]
  }
}
