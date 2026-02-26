import { CivManager } from '../civilization/CivManager'
import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'

export interface Caravan {
  id: number
  fromCivId: number
  toCivId: number
  fromPort: { x: number; y: number }
  toPort: { x: number; y: number }
  x: number
  y: number
  progress: number  // 0-1
  speed: number
  goods: { food: number; gold: number; wood: number; stone: number }
  returning: boolean
  color: string
}

export class CaravanSystem {
  private caravans: Caravan[] = []
  private nextId: number = 1
  private spawnTimers: Map<string, number> = new Map() // "fromCivId:toCivId" -> tick countdown

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem): void {

    // Spawn new caravans from active trade routes
    for (const [, civ] of civManager.civilizations) {
      for (const route of civ.tradeRoutes) {
        if (!route.active) continue

        const key = `${civ.id}:${route.partnerId}`
        const timer = this.spawnTimers.get(key) ?? 0

        if (timer <= 0) {
          // Spawn a new caravan
          const partner = civManager.civilizations.get(route.partnerId)
          if (!partner) continue

          const goods = {
            food: 2 + Math.random() * 3,
            gold: 1 + Math.random() * 2,
            wood: 1 + Math.random() * 2,
            stone: 0.5 + Math.random() * 1.5,
          }

          this.caravans.push({
            id: this.nextId++,
            fromCivId: civ.id,
            toCivId: route.partnerId,
            fromPort: { ...route.fromPort },
            toPort: { ...route.toPort },
            x: route.fromPort.x,
            y: route.fromPort.y,
            progress: 0,
            speed: 0.002 + civ.techLevel * 0.0005,
            goods,
            returning: false,
            color: civ.color,
          })

          this.spawnTimers.set(key, 500)
        } else {
          this.spawnTimers.set(key, timer - 1)
        }
      }
    }

    // Update existing caravans
    for (let i = this.caravans.length - 1; i >= 0; i--) {
      const c = this.caravans[i]

      c.progress += c.speed

      if (c.returning) {
        // Moving back: toPort -> fromPort
        const t = 1 - c.progress
        c.x = c.fromPort.x + (c.toPort.x - c.fromPort.x) * t
        c.y = c.fromPort.y + (c.toPort.y - c.fromPort.y) * t
      } else {
        // Moving forward: fromPort -> toPort
        c.x = c.fromPort.x + (c.toPort.x - c.fromPort.x) * c.progress
        c.y = c.fromPort.y + (c.toPort.y - c.fromPort.y) * c.progress
      }

      // Check for raiding in hostile territory
      if (Math.random() < 0.0005) {
        const tileX = Math.floor(c.x)
        const tileY = Math.floor(c.y)
        const tileCivId = civManager.territoryMap[tileY]?.[tileX]
        if (tileCivId && tileCivId !== c.fromCivId && tileCivId !== c.toCivId) {
          const tileCiv = civManager.civilizations.get(tileCivId)
          const fromCiv = civManager.civilizations.get(c.fromCivId)
          if (tileCiv && fromCiv) {
            const relation = tileCiv.relations.get(c.fromCivId) ?? 0
            if (relation < -30) {
              // Raided! Lose goods, spawn particles
              particles.spawn(c.x, c.y, 8, '#ff4400', 1.5)
              particles.spawn(c.x, c.y, 5, '#ffd700', 1)
              c.goods.food = 0
              c.goods.gold = 0
              c.goods.wood = 0
              c.goods.stone = 0
              // Remove caravan
              this.caravans.splice(i, 1)
              continue
            }
          }
        }
      }

      // Arrival
      if (c.progress >= 1) {
        if (!c.returning) {
          // Deliver goods to destination civ
          const destCiv = civManager.civilizations.get(c.toCivId)
          if (destCiv) {
            destCiv.resources.food += c.goods.food
            destCiv.resources.gold += c.goods.gold
            destCiv.resources.wood += c.goods.wood
            destCiv.resources.stone += c.goods.stone
          }
          // Spawn delivery particles
          particles.spawn(c.x, c.y, 4, '#ffd700', 0.8)

          // Start return trip
          c.returning = true
          c.progress = 0
        } else {
          // Returned home, remove caravan
          particles.spawn(c.x, c.y, 3, c.color, 0.6)
          this.caravans.splice(i, 1)
        }
      }
    }
  }

  getCaravans(): Caravan[] {
    return this.caravans
  }

  reset(): void {
    this.caravans = []
    this.spawnTimers.clear()
    this.nextId = 1
  }
}
