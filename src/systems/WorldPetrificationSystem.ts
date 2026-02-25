// World Petrification System (v2.80) - Magical petrification zones spread across the world
// Creatures caught in zones turn to stone, zones expand and contract cyclically

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export interface PetrificationZone {
  id: number
  x: number
  y: number
  radius: number
  maxRadius: number
  spreadRate: number
  intensity: number     // 0-100, chance to petrify
  age: number
  expanding: boolean
  petrifiedCount: number
}

export interface PetrifiedCreature {
  creatureId: number
  zoneId: number
  originalX: number
  originalY: number
  tick: number
  duration: number      // how long until freed
}

const CHECK_INTERVAL = 900
const MAX_ZONES = 5
const FORM_CHANCE = 0.01
const PETRIFY_CHANCE_MULT = 0.006
const FREE_CHANCE = 0.008
const MAX_AGE = 10000
const SPREAD_BASE = 0.03

export class WorldPetrificationSystem {
  private zones: PetrificationZone[] = []
  private petrified: PetrifiedCreature[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formZones(world)
    this.updateZones()
    this.petrifyCreatures(em, tick)
    this.freeCreatures(em)
    this.cleanupExpired()
  }

  private formZones(world: World): void {
    if (this.zones.length >= MAX_ZONES) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height
    const attempts = 15

    for (let a = 0; a < attempts; a++) {
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))

      const tile = world.getTile(x, y)
      // Petrification prefers rocky/mountain areas
      if (tile !== TileType.MOUNTAIN && tile !== TileType.GRASS && tile !== TileType.FOREST) continue

      const tooClose = this.zones.some(z => {
        const dx = z.x - x
        const dy = z.y - y
        return dx * dx + dy * dy < 400
      })
      if (tooClose) continue

      this.zones.push({
        id: this.nextId++,
        x, y,
        radius: 2,
        maxRadius: 4 + Math.floor(Math.random() * 4),
        spreadRate: SPREAD_BASE + Math.random() * 0.02,
        intensity: 30 + Math.random() * 40,
        age: 0,
        expanding: true,
        petrifiedCount: 0,
      })
      break
    }
  }

  private updateZones(): void {
    for (const zone of this.zones) {
      zone.age++

      if (zone.expanding) {
        zone.radius = Math.min(zone.maxRadius, zone.radius + zone.spreadRate)
        if (zone.radius >= zone.maxRadius) {
          zone.expanding = false
        }
      } else {
        zone.radius = Math.max(1, zone.radius - zone.spreadRate * 0.5)
        if (zone.radius <= 1 && Math.random() < 0.1) {
          zone.expanding = true
        }
      }

      // Intensity fluctuates
      zone.intensity = Math.max(10, Math.min(100,
        zone.intensity + (Math.random() - 0.5) * 8
      ))
    }
  }

  private petrifyCreatures(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const zone of this.zones) {
      for (const eid of entities) {
        // Already petrified
        if (this.petrified.some(p => p.creatureId === eid)) continue

        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const dx = pos.x - zone.x
        const dy = pos.y - zone.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > zone.radius) continue

        const chance = (zone.intensity / 100) * PETRIFY_CHANCE_MULT * (1 - dist / zone.radius)
        if (Math.random() > chance) continue

        this.petrified.push({
          creatureId: eid,
          zoneId: zone.id,
          originalX: pos.x,
          originalY: pos.y,
          tick,
          duration: 500 + Math.floor(Math.random() * 2000),
        })
        zone.petrifiedCount++
      }
    }
  }

  private freeCreatures(em: EntityManager): void {
    for (let i = this.petrified.length - 1; i >= 0; i--) {
      const p = this.petrified[i]
      p.duration--

      if (p.duration <= 0 || Math.random() < FREE_CHANCE) {
        // Restore creature position
        const pos = em.getComponent<PositionComponent>(p.creatureId, 'position')
        if (pos) {
          pos.x = p.originalX
          pos.y = p.originalY
        }

        // Decrement zone count
        const zone = this.zones.find(z => z.id === p.zoneId)
        if (zone) zone.petrifiedCount = Math.max(0, zone.petrifiedCount - 1)

        this.petrified.splice(i, 1)
      }
    }
  }

  private cleanupExpired(): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].age > MAX_AGE) {
        // Free all creatures in this zone
        const zoneId = this.zones[i].id
        for (let j = this.petrified.length - 1; j >= 0; j--) {
          if (this.petrified[j].zoneId === zoneId) {
            this.petrified.splice(j, 1)
          }
        }
        this.zones.splice(i, 1)
      }
    }
  }

  getZones(): PetrificationZone[] { return this.zones }
  getPetrified(): PetrifiedCreature[] { return this.petrified }
  isPetrified(creatureId: number): boolean {
    return this.petrified.some(p => p.creatureId === creatureId)
  }
}
