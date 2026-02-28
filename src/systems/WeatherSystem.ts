import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { ParticleSystem } from './ParticleSystem'
import { EntityManager, NeedsComponent, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { BuildingComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'tornado' | 'drought' | 'heatwave'

export class WeatherSystem {
  currentWeather: WeatherType = 'clear'
  intensity: number = 0 // 0-1
  private duration: number = 0
  private weatherTimer: number = 0
  private world: World
  private particles: ParticleSystem
  private em: EntityManager

  // Visual state
  windX: number = 0
  fogAlpha: number = 0

  // Tornado tracking
  tornadoX: number = 0
  tornadoY: number = 0
  tornadoDirX: number = 0
  tornadoDirY: number = 0

  constructor(world: World, particles: ParticleSystem, em: EntityManager) {
    this.world = world
    this.particles = particles
    this.em = em
  }

  update(): void {
    this.weatherTimer++

    // Weather transition
    if (this.duration > 0) {
      this.duration--
      if (this.duration === 0) {
        this.currentWeather = 'clear'
        this.intensity = 0
      }
    } else if (Math.random() < 0.0005) {
      this.startRandomWeather()
    }

    // Wind drift
    this.windX = Math.sin(this.weatherTimer * 0.01) * 0.5

    // Fog fade
    this.fogAlpha = this.currentWeather === 'fog'
      ? Math.min(0.4, this.fogAlpha + 0.005)
      : Math.max(0, this.fogAlpha - 0.01)

    // Weather effects
    if (this.currentWeather !== 'clear') {
      this.applyWeatherEffects()
    }
  }

  private startRandomWeather(): void {
    // Season-aware weather type selection
    const season = this.world.getSeason()
    let types: WeatherType[]
    switch (season) {
      case 'winter':
        types = ['snow', 'snow', 'snow', 'fog', 'rain']
        break
      case 'spring':
        types = ['rain', 'rain', 'rain', 'storm', 'fog', 'tornado']
        break
      case 'summer':
        types = ['clear', 'clear', 'rain', 'storm', 'fog', 'drought', 'drought', 'heatwave', 'heatwave']
        break
      case 'autumn':
        types = ['fog', 'fog', 'rain', 'rain', 'snow', 'tornado']
        break
      default:
        types = ['rain', 'rain', 'snow', 'storm', 'fog']
    }
    const picked = types[Math.floor(Math.random() * types.length)]
    if (picked === 'clear') return // summer clear = no weather event
    this.currentWeather = picked
    this.intensity = 0.3 + Math.random() * 0.7

    // Set duration based on weather type
    switch (picked) {
      case 'tornado':
        this.duration = 300 + Math.floor(Math.random() * 300)
        this.tornadoX = Math.floor(Math.random() * WORLD_WIDTH)
        this.tornadoY = Math.floor(Math.random() * WORLD_HEIGHT)
        this.tornadoDirX = (Math.random() - 0.5) * 2
        this.tornadoDirY = (Math.random() - 0.5) * 2
        break
      case 'drought':
        this.duration = 1200 + Math.floor(Math.random() * 1800)
        break
      case 'heatwave':
        this.duration = 600 + Math.floor(Math.random() * 900)
        break
      default:
        this.duration = 600 + Math.floor(Math.random() * 1800)
    }

    EventLog.log('weather', `${this.getWeatherLabel()} has begun`, this.world.tick)
  }

  private applyWeatherEffects(): void {
    switch (this.currentWeather) {
      case 'rain':
        this.applyRain()
        break
      case 'snow':
        this.applySnow()
        break
      case 'storm':
        this.applyStorm()
        break
      case 'fog':
        // Fog only affects visibility (handled in renderer)
        break
      case 'tornado':
        this.applyTornado()
        break
      case 'drought':
        this.applyDrought()
        break
      case 'heatwave':
        this.applyHeatwave()
        break
    }

    // Weather affects creatures
    if (this.weatherTimer % 60 === 0) {
      this.affectCreatures()
    }
  }

  private applyRain(): void {
    // Spawn rain particles across visible area
    if (this.weatherTimer % 2 === 0) {
      const count = Math.floor(this.intensity * 8)
      for (let i = 0; i < count; i++) {
        const x = Math.random() * WORLD_WIDTH
        const y = Math.random() * WORLD_HEIGHT
        this.particles.addParticle(
          x, y - 10,
          this.windX * 2,
          3 + Math.random() * 2,
          15 + Math.random() * 10,
          25,
          '#6688cc',
          0.5
        )
      }
    }

    // Slowly grow vegetation
    if (this.weatherTimer % 120 === 0) {
      const rx = Math.floor(Math.random() * WORLD_WIDTH)
      const ry = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(rx, ry)
      if (tile === TileType.SAND && Math.random() < this.intensity * 0.3) {
        this.world.setTile(rx, ry, TileType.GRASS)
      } else if (tile === TileType.GRASS && Math.random() < this.intensity * 0.1) {
        this.world.setTile(rx, ry, TileType.FOREST)
      }
    }
  }

  private applySnow(): void {
    // Spawn snow particles
    if (this.weatherTimer % 3 === 0) {
      const count = Math.floor(this.intensity * 5)
      for (let i = 0; i < count; i++) {
        const x = Math.random() * WORLD_WIDTH
        const y = Math.random() * WORLD_HEIGHT
        this.particles.addParticle(
          x, y - 8,
          this.windX + (Math.random() - 0.5) * 0.5,
          0.5 + Math.random() * 0.8,
          40 + Math.random() * 30,
          70,
          '#eeeeff',
          0.8 + Math.random() * 0.5
        )
      }
    }

    // Snow covers terrain at high elevations
    if (this.weatherTimer % 180 === 0 && this.intensity > 0.5) {
      const rx = Math.floor(Math.random() * WORLD_WIDTH)
      const ry = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(rx, ry)
      if (tile === TileType.MOUNTAIN && Math.random() < 0.2) {
        this.world.setTile(rx, ry, TileType.SNOW)
      }
    }
  }

  private applyStorm(): void {
    // Rain + occasional lightning
    this.applyRain()

    // Lightning strike
    if (Math.random() < 0.003 * this.intensity) {
      const lx = Math.floor(Math.random() * WORLD_WIDTH)
      const ly = Math.floor(Math.random() * WORLD_HEIGHT)

      // Lightning flash particle
      this.particles.spawnExplosion(lx, ly)

      // Small chance to set fire (turn forest to sand)
      const tile = this.world.getTile(lx, ly)
      if (tile === TileType.FOREST && Math.random() < 0.4) {
        this.world.setTile(lx, ly, TileType.SAND)
        this.particles.spawn(lx, ly, 6, '#ff6600', 1.5)
      }

      // Can kill nearby creatures
      const entities = this.em.getEntitiesWithComponents('position', 'needs')
      for (const id of entities) {
        const pos = this.em.getComponent<PositionComponent>(id, 'position')
        if (!pos) continue
        const dx = pos.x - lx
        const dy = pos.y - ly
        if (dx * dx + dy * dy < 9 && Math.random() < 0.3) {
          const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
          if (needs) needs.health -= 30
        }
      }
    }
  }

  private applyTornado(): void {
    // Move tornado along its path
    this.tornadoDirX += (Math.random() - 0.5) * 0.3
    this.tornadoDirY += (Math.random() - 0.5) * 0.3
    const dirLen = Math.sqrt(this.tornadoDirX * this.tornadoDirX + this.tornadoDirY * this.tornadoDirY)
    if (dirLen > 0) {
      const speed = 0.3 + Math.random() * 0.2
      this.tornadoX += (this.tornadoDirX / dirLen) * speed
      this.tornadoY += (this.tornadoDirY / dirLen) * speed
    }

    // Clamp to world bounds
    this.tornadoX = Math.max(0, Math.min(WORLD_WIDTH - 1, this.tornadoX))
    this.tornadoY = Math.max(0, Math.min(WORLD_HEIGHT - 1, this.tornadoY))

    // Destroy terrain at tornado position
    const tx = Math.floor(this.tornadoX)
    const ty = Math.floor(this.tornadoY)
    const tile = this.world.getTile(tx, ty)
    if (tile === TileType.FOREST) {
      this.world.setTile(tx, ty, TileType.GRASS)
    } else if (tile === TileType.GRASS) {
      this.world.setTile(tx, ty, TileType.SAND)
    }

    // Damage buildings on the path
    const buildingEntities = this.em.getEntitiesWithComponents('position', 'building')
    for (const id of buildingEntities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      if (!pos || !b) continue
      const dx = pos.x - this.tornadoX
      const dy = pos.y - this.tornadoY
      if (dx * dx + dy * dy < 4) {
        b.health -= 10
      }
    }

    // Damage creatures within 5 tiles
    const creatureEntities = this.em.getEntitiesWithComponents('position', 'needs')
    for (const id of creatureEntities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      if (!pos || !needs) continue
      const dx = pos.x - this.tornadoX
      const dy = pos.y - this.tornadoY
      if (dx * dx + dy * dy < 25) {
        needs.health -= 5
      }
    }

    // Rotating gray particles around tornado
    if (this.weatherTimer % 2 === 0) {
      for (let i = 0; i < 8; i++) {
        const angle = (this.weatherTimer * 0.2) + (i * Math.PI * 2 / 8)
        const radius = 1 + Math.random() * 2
        this.particles.addParticle(this.tornadoX + Math.cos(angle) * radius, this.tornadoY + Math.sin(angle) * radius, Math.cos(angle + Math.PI / 2) * 1.5, Math.sin(angle + Math.PI / 2) * 1.5 - 0.5, 20 + Math.random() * 15, 35, '#888888', 0.8 + Math.random() * 0.6)
      }
    }
  }

  private applyDrought(): void {
    // Every 200 ticks, convert water/grass to sand
    if (this.weatherTimer % 200 === 0) {
      const rx = Math.floor(Math.random() * WORLD_WIDTH)
      const ry = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(rx, ry)
      if (tile === TileType.SHALLOW_WATER) {
        this.world.setTile(rx, ry, TileType.SAND)
      } else if (tile === TileType.GRASS) {
        this.world.setTile(rx, ry, TileType.SAND)
      }
    }

    // Log drought event periodically
    if (this.weatherTimer % 600 === 0) {
      EventLog.log('weather', 'The drought continues to parch the land...', this.world.tick)
    }
  }

  private applyHeatwave(): void {
    // Every 300 ticks, melt snow -> mountain
    if (this.weatherTimer % 300 === 0) {
      const rx = Math.floor(Math.random() * WORLD_WIDTH)
      const ry = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = this.world.getTile(rx, ry)
      if (tile === TileType.SNOW) {
        this.world.setTile(rx, ry, TileType.MOUNTAIN)
      }
    }

    // Occasional orange/red rising heat particles
    if (this.weatherTimer % 10 === 0) {
      const count = Math.floor(this.intensity * 3)
      for (let i = 0; i < count; i++) {
        const x = Math.random() * WORLD_WIDTH
        const y = Math.random() * WORLD_HEIGHT
        const color = Math.random() < 0.5 ? '#ff6633' : '#cc3300'
        this.particles.addParticle(
          x,
          y,
          (Math.random() - 0.5) * 0.3,
          -0.3 - Math.random() * 0.4,
          25 + Math.random() * 20,
          45,
          color,
          0.6 + Math.random() * 0.4
        )
      }
    }
  }

  private affectCreatures(): void {
    const entities = this.em.getEntitiesWithComponents('position', 'needs', 'creature')

    for (const id of entities) {
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')
      if (!needs || !creature) continue

      switch (this.currentWeather) {
        case 'rain':
          // Rain slightly reduces hunger (drinking water)
          needs.hunger = Math.max(0, needs.hunger - 0.05 * this.intensity)
          break
        case 'snow':
          // Cold damages creatures without shelter (except dragons)
          if (creature.species !== 'dragon') {
            needs.health -= 0.02 * this.intensity
          }
          // Increases hunger faster
          needs.hunger += 0.03 * this.intensity
          break
        case 'storm':
          // Storm scares creatures, slight damage
          if (creature.species !== 'dragon') {
            needs.health -= 0.01 * this.intensity
          }
          break
        case 'drought':
          // Hunger increases faster during drought
          needs.hunger += 0.05 * this.intensity
          break
        case 'heatwave':
          // Heat damages creatures (dragons are immune)
          if (creature.species !== 'dragon') {
            needs.health -= 0.03 * this.intensity
          }
          break
      }
    }
  }

  getWeatherLabel(): string {
    switch (this.currentWeather) {
      case 'clear': return '☀️ Clear'
      case 'rain': return '🌧️ Rain'
      case 'snow': return '❄️ Snow'
      case 'storm': return '⛈️ Storm'
      case 'fog': return '🌫️ Fog'
      case 'tornado': return '🌪️ Tornado'
      case 'drought': return '🏜️ Drought'
      case 'heatwave': return '🔥 Heat Wave'
    }
  }
}
