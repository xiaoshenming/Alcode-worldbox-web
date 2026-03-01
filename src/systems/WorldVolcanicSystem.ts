// World Volcanic System (v2.52) - Volcanic activity and eruptions
// Volcanoes form in mountain regions, cycle between dormant/active/erupting
// Eruptions create lava, destroy terrain, and affect nearby creatures

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type VolcanoState = 'dormant' | 'rumbling' | 'active' | 'erupting' | 'cooling'

export interface Volcano {
  id: number
  x: number
  y: number
  state: VolcanoState
  power: number         // 0-100
  lastEruption: number
  eruptionCount: number
  heatRadius: number
}

const CHECK_INTERVAL = 1200
const STATE_INTERVAL = 600
const MAX_VOLCANOES = 8
const ERUPTION_CHANCE = 0.03

const STATE_TRANSITIONS: Record<VolcanoState, VolcanoState[]> = {
  dormant: ['rumbling'],
  rumbling: ['active', 'dormant'],
  active: ['erupting', 'rumbling'],
  erupting: ['cooling'],
  cooling: ['dormant'],
}

let nextVolcanoId = 1

export class WorldVolcanicSystem {
  private volcanoes: Volcano[] = []
  private lastCheck = 0
  private lastState = 0
  private worldWidth = 0
  private worldHeight = 0
  private _activeVolcBuf: Volcano[] = []

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.detectVolcanoes(world, tick)
    }
    if (tick - this.lastState >= STATE_INTERVAL) {
      this.lastState = tick
      this.updateStates(world, tick)
    }
  }

  private detectVolcanoes(world: World, tick: number): void {
    if (this.volcanoes.length >= MAX_VOLCANOES) return
    // Scan for mountain clusters to place volcanoes
    for (let attempt = 0; attempt < 5; attempt++) {
      const x = Math.floor(Math.random() * this.worldWidth)
      const y = Math.floor(Math.random() * this.worldHeight)
      const terrain = world.getTile(x, y)
      if (terrain !== TileType.MOUNTAIN) continue
      // Check not too close to existing volcano
      const tooClose = this.volcanoes.some(v => {
        const dx = v.x - x, dy = v.y - y
        return dx * dx + dy * dy < 400
      })
      if (tooClose) continue
      this.volcanoes.push({
        id: nextVolcanoId++,
        x, y,
        state: 'dormant',
        power: 20 + Math.floor(Math.random() * 60),
        lastEruption: 0,
        eruptionCount: 0,
        heatRadius: 3 + Math.floor(Math.random() * 4),
      })
      break
    }
  }

  private updateStates(world: World, tick: number): void {
    for (const volcano of this.volcanoes) {
      const transitions = STATE_TRANSITIONS[volcano.state]
      if (volcano.state === 'dormant' && Math.random() > ERUPTION_CHANCE) continue
      if (volcano.state === 'erupting') {
        // Apply eruption effects - spread lava nearby
        this.applyEruption(volcano, world)
        volcano.state = 'cooling'
        volcano.lastEruption = tick
        volcano.eruptionCount++
        continue
      }
      if (transitions.length > 0) {
        volcano.state = transitions[Math.floor(Math.random() * transitions.length)]
      }
    }
  }

  private applyEruption(volcano: Volcano, world: World): void {
    const r = volcano.heatRadius
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx * dx + dy * dy > r * r) continue
        const tx = volcano.x + dx, ty = volcano.y + dy
        if (tx < 0 || tx >= this.worldWidth || ty < 0 || ty >= this.worldHeight) continue
        const distSq = dx * dx + dy * dy
        if (distSq < r * r * 0.16) {
          world.setTile(tx, ty, TileType.LAVA)
        } else if (distSq < r * r * 0.49 && Math.random() < 0.5) {
          world.setTile(tx, ty, TileType.LAVA)
        }
      }
    }
  }

  getActiveVolcanoes(): Volcano[] {
    this._activeVolcBuf.length = 0
    for (const v of this.volcanoes) { if (v.state !== 'dormant' && v.state !== 'cooling') this._activeVolcBuf.push(v) }
    return this._activeVolcBuf
  }
  getEruptingCount(): number {
    let n = 0
    for (const v of this.volcanoes) { if (v.state === 'erupting') n++ }
    return n
  }
}
