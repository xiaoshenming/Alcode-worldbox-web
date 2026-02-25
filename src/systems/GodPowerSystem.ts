// God Power System — divine abilities the player can invoke on the world

import { World } from '../game/World'
import { EntityManager, PositionComponent, NeedsComponent, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization, CivMemberComponent } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { TileType } from '../utils/Constants'
import { EventLog } from './EventLog'

export type GodPowerType = 'bless' | 'curse' | 'volcano' | 'time_warp' | 'divine_storm'

interface ActiveEffect {
  type: GodPowerType
  x: number
  y: number
  radius: number
  ticksLeft: number
}

const EFFECT_RADIUS = 8
const EFFECT_DURATION: Record<GodPowerType, number> = {
  bless: 300,
  curse: 400,
  volcano: 600,
  time_warp: 250,
  divine_storm: 200,
}

export class GodPowerSystem {
  private effects: ActiveEffect[] = []

  activatePower(power: GodPowerType, x: number, y: number): void {
    this.effects.push({
      type: power,
      x: Math.floor(x),
      y: Math.floor(y),
      radius: power === 'volcano' ? 5 : EFFECT_RADIUS,
      ticksLeft: EFFECT_DURATION[power],
    })
    EventLog.log('world_event', `God Power activated: ${power} at (${Math.floor(x)}, ${Math.floor(y)})`, 0)
  }

  update(world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]
      e.ticksLeft--

      if (e.ticksLeft <= 0) {
        this.effects.splice(i, 1)
        continue
      }

      switch (e.type) {
        case 'bless': this.tickBless(e, world, em, civManager, particles, tick); break
        case 'curse': this.tickCurse(e, world, em, civManager, particles, tick); break
        case 'volcano': this.tickVolcano(e, world, em, particles, tick); break
        case 'time_warp': this.tickTimeWarp(e, world, em, civManager, particles, tick); break
        case 'divine_storm': this.tickDivineStorm(e, world, em, particles, tick); break
      }
    }
  }

  // --- Bless: heal + feed + loyalty boost + gold particles ---

  private tickBless(e: ActiveEffect, world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Particles every 4 ticks
    if (tick % 4 === 0) {
      const px = e.x + (Math.random() - 0.5) * e.radius * 2
      const py = e.y + (Math.random() - 0.5) * e.radius * 2
      particles.spawn(px, py, 2, '#ffd700', 1)
    }

    // Heal + feed every 10 ticks
    if (tick % 10 !== 0) return

    for (const id of this.entitiesInRadius(em, e.x, e.y, e.radius)) {
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (needs) {
        needs.health = Math.min(100, needs.health + 5)
        needs.hunger = Math.max(0, needs.hunger - 10)
      }
    }

    // Loyalty boost for civs in area
    const civ = civManager.getCivAt(e.x, e.y)
    if (civ) {
      civ.happiness = Math.min(100, civ.happiness + 0.3)
    }
  }

  // --- Curse: damage + loyalty drain + dark particles ---

  private tickCurse(e: ActiveEffect, world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    if (tick % 5 === 0) {
      const px = e.x + (Math.random() - 0.5) * e.radius * 2
      const py = e.y + (Math.random() - 0.5) * e.radius * 2
      const color = Math.random() < 0.5 ? '#8b00ff' : '#8b0000'
      particles.spawn(px, py, 2, color, 1.5)
    }

    if (tick % 12 !== 0) return

    for (const id of this.entitiesInRadius(em, e.x, e.y, e.radius)) {
      const needs = em.getComponent<NeedsComponent>(id, 'needs')
      if (needs) {
        needs.health = Math.max(0, needs.health - 4)
        if (needs.health <= 0) {
          em.removeEntity(id)
          particles.spawn(e.x, e.y, 5, '#8b0000', 2)
        }
      }
    }

    const civ = civManager.getCivAt(e.x, e.y)
    if (civ) {
      civ.happiness = Math.max(0, civ.happiness - 0.4)
    }
  }

  // --- Volcano: terrain morph + lava spread + eruption particles ---

  private tickVolcano(e: ActiveEffect, world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    // Initial eruption: set center to lava + mountain ring
    if (e.ticksLeft === EFFECT_DURATION.volcano - 1) {
      world.setTile(e.x, e.y, TileType.LAVA)
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = e.x + dx, ny = e.y + dy
        if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height) {
          world.setTile(nx, ny, TileType.MOUNTAIN)
        }
      }
      particles.spawnExplosion(e.x, e.y)
      EventLog.log('disaster', `Volcano erupts at (${e.x}, ${e.y})!`, tick)
    }

    // Continuous eruption particles
    if (tick % 6 === 0) {
      particles.spawn(e.x, e.y, 3, '#ff4400', 2)
      particles.spawn(e.x, e.y, 2, '#ff8800', 1.5)
    }

    // Lava spread every 20 ticks
    if (tick % 20 !== 0) return

    const spreadDist = Math.min(e.radius, 2 + Math.floor((EFFECT_DURATION.volcano - e.ticksLeft) / 80))
    for (let dy = -spreadDist; dy <= spreadDist; dy++) {
      for (let dx = -spreadDist; dx <= spreadDist; dx++) {
        if (dx * dx + dy * dy > spreadDist * spreadDist) continue
        const tx = e.x + dx, ty = e.y + dy
        if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) continue

        const tile = world.getTile(tx, ty)
        if (tile === TileType.DEEP_WATER || tile === TileType.LAVA) continue

        if (Math.random() < 0.15) {
          world.setTile(tx, ty, TileType.LAVA)
          this.killAt(em, tx, ty, 0.5)
        }
      }
    }
  }

  // --- Time Warp: tech boost + age shift + blue/white particles ---

  private tickTimeWarp(e: ActiveEffect, world: World, em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    if (tick % 3 === 0) {
      const angle = tick * 0.1
      const px = e.x + Math.cos(angle) * e.radius * 0.6
      const py = e.y + Math.sin(angle) * e.radius * 0.6
      const color = Math.random() < 0.6 ? '#4488ff' : '#ffffff'
      particles.spawn(px, py, 1, color, 0.8)
    }

    if (tick % 30 !== 0) return

    // Tech boost for civ in area
    const civ = civManager.getCivAt(e.x, e.y)
    if (civ && civ.techLevel < 5) {
      civ.research.progress += 5
      if (civ.research.progress >= 100) {
        civ.techLevel = Math.min(5, civ.techLevel + 1)
        civ.research.progress = 0
        EventLog.log('tech', `Time Warp advanced ${civ.name} to tech level ${civ.techLevel}`, tick)
      }
    }

    // Age creatures in area (random aging/rejuvenation)
    for (const id of this.entitiesInRadius(em, e.x, e.y, e.radius)) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue
      const shift = (Math.random() - 0.4) * 20 // slight bias toward aging
      creature.age = Math.max(0, Math.min(creature.maxAge, creature.age + shift))
    }
  }

  // --- Divine Storm: lightning strikes + damage + electric particles ---

  private tickDivineStorm(e: ActiveEffect, world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    // Ambient storm particles
    if (tick % 2 === 0) {
      const px = e.x + (Math.random() - 0.5) * e.radius * 2
      const py = e.y + (Math.random() - 0.5) * e.radius * 2
      particles.spawn(px, py, 1, '#ffffff', 1)
    }

    // Lightning strike every 8 ticks
    if (tick % 8 !== 0) return

    const strikeX = e.x + Math.floor((Math.random() - 0.5) * e.radius * 2)
    const strikeY = e.y + Math.floor((Math.random() - 0.5) * e.radius * 2)

    // Flash effect
    particles.spawn(strikeX, strikeY, 6, '#ffff00', 3)
    particles.spawn(strikeX, strikeY, 4, '#ffffff', 2)

    // Damage entities at strike point
    this.killAt(em, strikeX, strikeY, 0.6)

    // Chance to set forest on fire (turn to sand)
    if (strikeX >= 0 && strikeX < world.width && strikeY >= 0 && strikeY < world.height) {
      const tile = world.getTile(strikeX, strikeY)
      if (tile === TileType.FOREST && Math.random() < 0.3) {
        world.setTile(strikeX, strikeY, TileType.SAND)
        particles.spawn(strikeX, strikeY, 4, '#ff4400', 2)
      }
    }
  }

  // --- Helpers ---

  private entitiesInRadius(em: EntityManager, cx: number, cy: number, radius: number): number[] {
    const r2 = radius * radius
    const result: number[] = []
    for (const id of em.getEntitiesWithComponent('position')) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - cx, dy = pos.y - cy
      if (dx * dx + dy * dy <= r2) result.push(id)
    }
    return result
  }

  private killAt(em: EntityManager, x: number, y: number, chance: number): void {
    for (const id of em.getEntitiesWithComponent('position')) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - x, dy = pos.y - y
      if (dx * dx + dy * dy < 2 && Math.random() < chance) {
        em.removeEntity(id)
      }
    }
  }

  getActiveEffects(): ActiveEffect[] {
    return this.effects
  }
}
