// World Hot Spring System (v3.22) - Hot springs appear near mountains
// Creatures nearby slowly recover health from the warm waters

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface HotSpring {
  id: number
  x: number
  y: number
  temperature: number   // 30-100
  healPower: number     // 1-10
  radius: number
  tick: number
}

const CHECK_INTERVAL = 600
const SPAWN_CHANCE = 0.004
const MAX_SPRINGS = 20
const HEAL_INTERVAL = 300

export class WorldHotSpringSystem {
  private springs: HotSpring[] = []
  private nextId = 1
  private lastCheck = 0
  private lastHeal = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.trySpawnSpring(world, tick)
      this.evolve()
    }

    if (tick - this.lastHeal >= HEAL_INTERVAL) {
      this.lastHeal = tick
      this.healNearby(em)
    }
  }

  private trySpawnSpring(world: any, tick: number): void {
    if (this.springs.length >= MAX_SPRINGS) return
    if (Math.random() > SPAWN_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 15; attempt++) {
      const x = 2 + Math.floor(Math.random() * (w - 4))
      const y = 2 + Math.floor(Math.random() * (h - 4))

      const tile = world.getTile(x, y)
      if (tile !== TileType.MOUNTAIN && tile !== TileType.LAVA) continue

      // Check for adjacent mountain or lava tiles
      let validNeighbors = 0
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.MOUNTAIN || t === TileType.LAVA) validNeighbors++
        }
      }
      if (validNeighbors < 2) continue

      this.springs.push({
        id: this.nextId++,
        x, y,
        temperature: 30 + Math.random() * 70,
        healPower: 1 + Math.floor(Math.random() * 10),
        radius: 3 + Math.floor(Math.random() * 4),
        tick,
      })
      break
    }
  }

  private evolve(): void {
    for (const spring of this.springs) {
      // Temperature fluctuates slightly
      spring.temperature = Math.max(30, Math.min(100,
        spring.temperature + (Math.random() - 0.5) * 2))
    }
  }

  private healNearby(em: EntityManager): void {
    if (this.springs.length === 0) return

    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!pos || !needs) continue

      for (const spring of this.springs) {
        const dx = pos.x - spring.x
        const dy = pos.y - spring.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= spring.radius && needs.health < 100) {
          needs.health = Math.min(100, needs.health + spring.healPower * 0.1)
          break
        }
      }
    }
  }

  getSprings(): HotSpring[] { return this.springs }
  getSpringCount(): number { return this.springs.length }
}
