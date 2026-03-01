/**
 * VolcanoSystem - Volcanic eruptions, lava flow, terrain transformation, and aftermath
 * v1.25
 */

import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'

export interface Volcano {
  id: number
  x: number
  y: number
  pressure: number       // 0-100, erupts at 100
  pressureRate: number   // how fast pressure builds
  active: boolean        // currently erupting
  eruptionTick: number   // when eruption started
  eruptionDuration: number
  dormantUntil: number   // tick when it can start building pressure again
  lavaFlows: LavaFlow[]
}

export interface LavaFlow {
  x: number
  y: number
  dx: number
  dy: number
  heat: number    // 0-100, cools over time
  age: number
}

let nextVolcanoId = 1

export class VolcanoSystem {
  private volcanoes: Volcano[] = []
  private static MAX_VOLCANOES = 10
  private static ERUPTION_PRESSURE = 100
  private static LAVA_COOL_RATE = 0.15
  private static LAVA_SPREAD_INTERVAL = 30
  private static MAX_LAVA_PER_VOLCANO = 80
  // Reusable buffer for updateLavaFlows (called every tick during eruption)
  private _lavaToRemoveBuf: number[] = []

  getVolcanoes(): ReadonlyArray<Volcano> {
    return this.volcanoes
  }

  /**
   * Create a volcano at a mountain tile
   */
  createVolcano(x: number, y: number): Volcano | null {
    if (this.volcanoes.length >= VolcanoSystem.MAX_VOLCANOES) return null
    // Don't place too close to existing volcanoes
    for (const v of this.volcanoes) {
      const dx = v.x - x, dy = v.y - y
      if (dx * dx + dy * dy < 400) return null  // min 20 tiles apart
    }

    const volcano: Volcano = {
      id: nextVolcanoId++,
      x, y,
      pressure: Math.random() * 30,
      pressureRate: 0.02 + Math.random() * 0.05,
      active: false,
      eruptionTick: 0,
      eruptionDuration: 300 + Math.floor(Math.random() * 600),
      dormantUntil: 0,
      lavaFlows: [],
    }
    this.volcanoes.push(volcano)
    return volcano
  }

  /**
   * Scan world for mountain tiles and auto-create volcanoes
   */
  autoPlaceVolcanoes(world: World): void {
    if (this.volcanoes.length >= 3) return  // already have enough

    const candidates: { x: number; y: number; score: number }[] = []
    const w = world.width, h = world.height

    // Sample mountain regions
    for (let y = 5; y < h - 5; y += 10) {
      for (let x = 5; x < w - 5; x += 10) {
        if (world.getTile(x, y) !== 6) continue  // MOUNTAIN = 6
        let mountainCount = 0
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (world.getTile(x + dx, y + dy) === 6) mountainCount++
          }
        }
        if (mountainCount >= 5) {
          candidates.push({ x, y, score: mountainCount })
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    const toCreate = Math.min(3 - this.volcanoes.length, candidates.length)
    for (let i = 0; i < toCreate; i++) {
      this.createVolcano(candidates[i].x, candidates[i].y)
    }
  }

  private startEruption(volcano: Volcano, tick: number): void {
    volcano.active = true
    volcano.eruptionTick = tick
    volcano.pressure = 0
    volcano.lavaFlows = []
  }

  private endEruption(volcano: Volcano, tick: number): void {
    volcano.active = false
    volcano.dormantUntil = tick + 2000 + Math.floor(Math.random() * 3000)
    volcano.eruptionDuration = 300 + Math.floor(Math.random() * 600)
  }

  private spreadLava(volcano: Volcano, world: World): void {
    if (volcano.lavaFlows.length >= VolcanoSystem.MAX_LAVA_PER_VOLCANO) return

    // Emit new lava from crater
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 0.7
    volcano.lavaFlows.push({
      x: volcano.x,
      y: volcano.y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      heat: 100,
      age: 0,
    })
  }

  private updateLavaFlows(volcano: Volcano, world: World): void {
    const toRemove = this._lavaToRemoveBuf
    toRemove.length = 0

    for (let i = 0; i < volcano.lavaFlows.length; i++) {
      const lava = volcano.lavaFlows[i]
      lava.age++
      lava.heat -= VolcanoSystem.LAVA_COOL_RATE

      if (lava.heat <= 0) {
        // Cooled lava becomes rock/mountain
        const tx = Math.floor(lava.x), ty = Math.floor(lava.y)
        if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
          const current = world.getTile(tx, ty)
          if (current !== 0 && current !== 6) {  // not DEEP_WATER or MOUNTAIN
            world.setTile(tx, ty, Math.random() < 0.3 ? 6 : 5)  // MOUNTAIN or STONE
          }
        }
        toRemove.push(i)
        continue
      }

      // Flow downhill (simplified — just move in direction with gravity bias)
      lava.x += lava.dx * 0.3
      lava.y += lava.dy * 0.3

      // Lava hitting water creates steam and stone
      const tx = Math.floor(lava.x), ty = Math.floor(lava.y)
      if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
        const tile = world.getTile(tx, ty)
        if (tile === 0 || tile === 1) {  // DEEP_WATER or SHALLOW_WATER
          world.setTile(tx, ty, 5)  // STONE
          lava.heat -= 30  // rapid cooling
        } else if (tile === 4) {  // FOREST
          world.setTile(tx, ty, 7)  // LAVA tile type
        } else if (tile === 3) {  // GRASS
          world.setTile(tx, ty, 7)  // LAVA
        }
      }

      // Out of bounds
      if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) {
        toRemove.push(i)
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      volcano.lavaFlows.splice(toRemove[i], 1)
    }
  }

  update(tick: number, world: World, particles: ParticleSystem): void {
    for (const volcano of this.volcanoes) {
      if (volcano.active) {
        // Erupting
        const elapsed = tick - volcano.eruptionTick
        if (elapsed >= volcano.eruptionDuration) {
          this.endEruption(volcano, tick)
          continue
        }

        // Spread lava periodically
        if (tick % VolcanoSystem.LAVA_SPREAD_INTERVAL === 0) {
          this.spreadLava(volcano, world)
        }

        // Update existing lava flows
        this.updateLavaFlows(volcano, world)

        // Visual effects
        if (tick % 20 === 0) {
          particles.spawnExplosion(volcano.x, volcano.y)
        }
      } else {
        // Dormant — build pressure
        if (tick < volcano.dormantUntil) continue
        volcano.pressure += volcano.pressureRate

        // Random seismic activity near threshold
        if (volcano.pressure > 70 && Math.random() < 0.01) {
          particles.spawnExplosion(volcano.x, volcano.y)
        }

        if (volcano.pressure >= VolcanoSystem.ERUPTION_PRESSURE) {
          this.startEruption(volcano, tick)
        }
      }
    }
  }

}
