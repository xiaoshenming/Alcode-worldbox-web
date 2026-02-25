// World Irrigation System (v3.102) - Civilizations build irrigation channels
// Irrigation channels carry water from rivers to farmland, boosting crop growth

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ChannelState = 'planned' | 'digging' | 'flowing' | 'silted'

export interface IrrigationChannel {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  state: ChannelState
  flowRate: number
  siltLevel: number
  length: number
  tick: number
}

const CHECK_INTERVAL = 3000
const BUILD_CHANCE = 0.003
const MAX_CHANNELS = 25
const SILT_RATE = 0.2

export class WorldIrrigationSystem {
  private channels: IrrigationChannel[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build new channels near water and grassland
    if (this.channels.length < MAX_CHANNELS && Math.random() < BUILD_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === 3) {
        let waterX = -1, waterY = -1
        for (let dx = -5; dx <= 5 && waterX < 0; dx++) {
          for (let dy = -5; dy <= 5 && waterX < 0; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t != null && t <= 1) { waterX = x + dx; waterY = y + dy }
          }
        }
        if (waterX >= 0) {
          const length = Math.abs(waterX - x) + Math.abs(waterY - y)
          this.channels.push({
            id: this.nextId++,
            startX: waterX, startY: waterY,
            endX: x, endY: y,
            state: 'planned',
            flowRate: 0,
            siltLevel: 0,
            length,
            tick,
          })
        }
      }
    }

    // Update channel states
    for (const c of this.channels) {
      switch (c.state) {
        case 'planned':
          if (Math.random() < 0.1) c.state = 'digging'
          break
        case 'digging':
          if (Math.random() < 0.05) {
            c.state = 'flowing'
            c.flowRate = 50 + Math.random() * 50
          }
          break
        case 'flowing':
          c.siltLevel += SILT_RATE
          c.flowRate = Math.max(5, c.flowRate - c.siltLevel * 0.01)
          if (c.siltLevel > 80) c.state = 'silted'
          break
        case 'silted':
          if (Math.random() < 0.02) {
            c.siltLevel = 10
            c.state = 'flowing'
            c.flowRate = 30 + Math.random() * 30
          }
          break
      }
    }

    // Remove very old channels
    const cutoff = tick - 200000
    for (let i = this.channels.length - 1; i >= 0; i--) {
      if (this.channels[i].tick < cutoff) this.channels.splice(i, 1)
    }
  }

  getChannels(): readonly IrrigationChannel[] { return this.channels }
}
