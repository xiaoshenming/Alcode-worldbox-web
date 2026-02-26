import { TileType, EntityType, PowerType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from './World'
import { EntityManager, RenderComponent, PositionComponent } from '../ecs/Entity'
import { CreatureFactory } from '../entities/CreatureFactory'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from '../systems/ParticleSystem'
import { SoundSystem } from '../systems/SoundSystem'

interface Power {
  type: PowerType
  name: string
  icon: string
  tileType?: TileType
  entityType?: EntityType
  action?: string
}

export class Powers {
  private world: World
  private em: EntityManager
  private factory: CreatureFactory
  private civManager: CivManager
  private particles: ParticleSystem
  private currentPower: Power | null = null
  private brushSize: number = 2

  readonly terrainPowers: Power[] = [
    { type: PowerType.TERRAIN, name: 'Deep Water', icon: '🌊', tileType: TileType.DEEP_WATER },
    { type: PowerType.TERRAIN, name: 'Shallow Water', icon: '💧', tileType: TileType.SHALLOW_WATER },
    { type: PowerType.TERRAIN, name: 'Sand', icon: '🏖️', tileType: TileType.SAND },
    { type: PowerType.TERRAIN, name: 'Grass', icon: '🌿', tileType: TileType.GRASS },
    { type: PowerType.TERRAIN, name: 'Forest', icon: '🌲', tileType: TileType.FOREST },
    { type: PowerType.TERRAIN, name: 'Mountain', icon: '⛰️', tileType: TileType.MOUNTAIN },
    { type: PowerType.TERRAIN, name: 'Snow', icon: '❄️', tileType: TileType.SNOW },
    { type: PowerType.TERRAIN, name: 'Lava', icon: '🔥', tileType: TileType.LAVA },
  ]

  readonly creaturePowers: Power[] = [
    { type: PowerType.CREATURE, name: 'Human', icon: '👤', entityType: EntityType.HUMAN },
    { type: PowerType.CREATURE, name: 'Elf', icon: '🧝', entityType: EntityType.ELF },
    { type: PowerType.CREATURE, name: 'Dwarf', icon: '🧔', entityType: EntityType.DWARF },
    { type: PowerType.CREATURE, name: 'Orc', icon: '👹', entityType: EntityType.ORC },
    { type: PowerType.CREATURE, name: 'Sheep', icon: '🐑', entityType: EntityType.SHEEP },
    { type: PowerType.CREATURE, name: 'Wolf', icon: '🐺', entityType: EntityType.WOLF },
    { type: PowerType.CREATURE, name: 'Dragon', icon: '🐉', entityType: EntityType.DRAGON },
  ]

  readonly naturePowers: Power[] = [
    { type: PowerType.NATURE, name: 'Rain', icon: '🌧️', action: 'rain' },
    { type: PowerType.NATURE, name: 'Lightning', icon: '⚡', action: 'lightning' },
    { type: PowerType.NATURE, name: 'Fire', icon: '🔥', action: 'fire' },
    { type: PowerType.NATURE, name: 'Earthquake', icon: '🌋', action: 'earthquake' },
    { type: PowerType.NATURE, name: 'Meteor', icon: '☄️', action: 'meteor' },
    { type: PowerType.NATURE, name: 'Tornado', icon: '🌪️', action: 'tornado' },
  ]

  readonly disasterPowers: Power[] = [
    { type: PowerType.DISASTER, name: 'Nuke', icon: '☢️', action: 'nuke' },
    { type: PowerType.DISASTER, name: 'Black Hole', icon: '🕳️', action: 'blackhole' },
    { type: PowerType.DISASTER, name: 'Acid Rain', icon: '☠️', action: 'acidrain' },
    { type: PowerType.DISASTER, name: 'Plague', icon: '🦠', action: 'plague' },
  ]

  private audio: SoundSystem

  constructor(world: World, em: EntityManager, factory: CreatureFactory, civManager: CivManager, particles: ParticleSystem, audio: SoundSystem) {
    this.world = world
    this.em = em
    this.factory = factory
    this.civManager = civManager
    this.particles = particles
    this.audio = audio
  }

  setPower(power: Power | null): void {
    this.currentPower = power
  }

  getPower(): Power | null {
    return this.currentPower
  }

  setBrushSize(size: number): void {
    this.brushSize = size
  }

  getBrushSize(): number {
    return this.brushSize
  }

  apply(x: number, y: number): void {
    if (!this.currentPower) return

    if (this.currentPower.tileType !== undefined) {
      this.applyTerrain(x, y)
    } else if (this.currentPower.entityType) {
      this.spawnCreature(x, y)
    } else if (this.currentPower.action) {
      this.applyNaturePower(x, y, this.currentPower.action)
    }
  }

  applyContinuous(x: number, y: number): void {
    if (!this.currentPower) return
    if (this.currentPower.tileType !== undefined) {
      this.applyTerrain(x, y)
    }
    // Creatures only spawn on click, not drag
  }

  private applyTerrain(x: number, y: number): void {
    if (!this.currentPower || this.currentPower.tileType === undefined) return
    const tileType = this.currentPower.tileType
    const half = Math.floor(this.brushSize / 2)
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const tx = x + dx
        const ty = y + dy
        if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
          this.world.setTile(tx, ty, tileType)
        }
      }
    }
    this.audio.playTerrain()
  }

  private spawnCreature(x: number, y: number): void {
    if (!this.currentPower || !this.currentPower.entityType) return
    const entityType = this.currentPower.entityType
    const tile = this.world.getTile(x, y)
    // Don't spawn in water or lava
    if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.LAVA) return
    const entityId = this.factory.spawn(entityType, x, y)
    this.audio.playSpawn()

    // Birth particle effect
    const render = this.em.getComponent<RenderComponent>(entityId, 'render')
    this.particles.spawnBirth(x, y, render ? render.color : '#ffffff')

    // Civilized species auto-create/join civilization
    const species = entityType
    const civilized = ['human', 'elf', 'dwarf', 'orc']
    if (civilized.includes(species)) {
      // Search nearby area for existing civilization (radius 15)
      const nearbyCiv = this.civManager.getNearestCiv(x, y, 15)
      if (nearbyCiv) {
        this.civManager.assignToCiv(entityId, nearbyCiv.id)
      } else {
        // Create new civilization only if no civ nearby
        const civ = this.civManager.createCiv(x, y)
        this.civManager.assignToCiv(entityId, civ.id, 'leader')
      }
    }
  }

  /** Public method to trigger a nature/disaster action from external callers (e.g. context menu) */
  applyAction(action: string, x: number, y: number): void {
    this.applyNaturePower(x, y, action)
  }

  private applyNaturePower(x: number, y: number, action: string): void {
    const half = Math.floor(this.brushSize)

    switch (action) {
      case 'rain':
        for (let dy = -half * 3; dy <= half * 3; dy++) {
          for (let dx = -half * 3; dx <= half * 3; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              const tile = this.world.getTile(tx, ty)
              if (tile === TileType.SAND && Math.random() < 0.3) this.world.setTile(tx, ty, TileType.GRASS)
              if (tile === TileType.GRASS && Math.random() < 0.1) this.world.setTile(tx, ty, TileType.FOREST)
            }
          }
        }
        this.particles.spawnRain(x, y)
        this.audio.playRain()
        break

      case 'lightning':
        if (Math.random() < 0.5) {
          this.world.setTile(x, y, TileType.LAVA)
        }
        // Kill nearby entities
        this.killEntitiesInRadius(x, y, 2)
        this.particles.spawnExplosion(x, y)
        this.audio.playExplosion()
        break

      case 'fire':
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              const tile = this.world.getTile(tx, ty)
              if (tile === TileType.FOREST || tile === TileType.GRASS) {
                if (Math.random() < 0.4) this.world.setTile(tx, ty, TileType.SAND)
              }
            }
          }
        }
        this.killEntitiesInRadius(x, y, half)
        this.audio.playExplosion()
        break

      case 'earthquake':
        for (let dy = -half * 2; dy <= half * 2; dy++) {
          for (let dx = -half * 2; dx <= half * 2; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              if (Math.random() < 0.2) {
                const tile = this.world.getTile(tx, ty)
                if (tile === TileType.MOUNTAIN) this.world.setTile(tx, ty, TileType.SAND)
                else if (tile === TileType.GRASS) this.world.setTile(tx, ty, TileType.MOUNTAIN)
              }
            }
          }
        }
        this.killEntitiesInRadius(x, y, half * 2)
        this.audio.playExplosion()
        break

      case 'meteor':
        // Create crater
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              if (dist < 2) this.world.setTile(tx, ty, TileType.LAVA)
              else if (dist < 3) this.world.setTile(tx, ty, TileType.MOUNTAIN)
              else if (dist < 4) this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
        this.killEntitiesInRadius(x, y, 5)
        this.particles.spawnExplosion(x, y)
        this.audio.playExplosion()
        break

      case 'tornado':
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2
          const dist = Math.random() * 5
          const tx = Math.floor(x + Math.cos(angle) * dist)
          const ty = Math.floor(y + Math.sin(angle) * dist)
          if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
            this.world.setTile(tx, ty, TileType.SAND)
          }
        }
        this.killEntitiesInRadius(x, y, 5)
        this.audio.playExplosion()
        break

      case 'nuke':
        for (let dy = -10; dy <= 10; dy++) {
          for (let dx = -10; dx <= 10; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              if (dist < 3) this.world.setTile(tx, ty, TileType.LAVA)
              else if (dist < 6) this.world.setTile(tx, ty, TileType.SAND)
              else if (dist < 10 && Math.random() < 0.5) this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
        this.killEntitiesInRadius(x, y, 12)
        this.particles.spawnExplosion(x, y)
        this.audio.playExplosion()
        break

      case 'blackhole':
        for (let dy = -8; dy <= 8; dy++) {
          for (let dx = -8; dx <= 8; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              if (dist < 8) this.world.setTile(tx, ty, TileType.DEEP_WATER)
            }
          }
        }
        this.killEntitiesInRadius(x, y, 10)
        this.audio.playExplosion()
        break

      case 'acidrain':
        for (let dy = -half * 4; dy <= half * 4; dy++) {
          for (let dx = -half * 4; dx <= half * 4; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
              const tile = this.world.getTile(tx, ty)
              if (Math.random() < 0.15) {
                if (tile === TileType.FOREST) this.world.setTile(tx, ty, TileType.GRASS)
                else if (tile === TileType.GRASS) this.world.setTile(tx, ty, TileType.SAND)
              }
            }
          }
        }
        this.killEntitiesInRadius(x, y, half * 2, 0.3)
        this.audio.playRain()
        break

      case 'plague':
        this.killEntitiesInRadius(x, y, half * 5, 0.5)
        this.audio.playDeath()
        break
    }
  }

  private killEntitiesInRadius(cx: number, cy: number, radius: number, chance: number = 1): void {
    const entities = this.em.getEntitiesWithComponent('position')
    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - cx
      const dy = pos.y - cy
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        if (Math.random() < chance) {
          this.em.removeEntity(id)
        }
      }
    }
  }
}
