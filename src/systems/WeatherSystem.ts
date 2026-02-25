import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { ParticleSystem } from './ParticleSystem'
import { EntityManager, NeedsComponent, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog'

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
        types = ['rain', 'rain', 'rain', 'storm', 'fog']
        break
      case 'summer':
        types = ['clear', 'clear', 'rain', 'storm', 'fog']
        break
      case 'autumn':
        types = ['fog', 'fog', 'rain', 'rain', 'snow']
        break
      default:
        types = ['rain', 'rain', 'snow', 'storm', 'fog']
    }
    const picked = types[Math.floor(Math.random() * types.length)]
    if (picked === 'clear') return // summer clear = no weather event
    this.currentWeather = picked
    this.intensity = 0.3 + Math.random() * 0.7
    this.duration = 600 + Math.floor(Math.random() * 1800)
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
        this.particles.addParticle({
          x, y: y - 10,
          vx: this.windX * 2,
          vy: 3 + Math.random() * 2,
          life: 15 + Math.random() * 10,
          maxLife: 25,
          color: '#6688cc',
          size: 0.5
        })
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
        this.particles.addParticle({
          x, y: y - 8,
          vx: this.windX + (Math.random() - 0.5) * 0.5,
          vy: 0.5 + Math.random() * 0.8,
          life: 40 + Math.random() * 30,
          maxLife: 70,
          color: '#eeeeff',
          size: 0.8 + Math.random() * 0.5
        })
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
        const pos = this.em.getComponent<PositionComponent>(id, 'position')!
        const dx = pos.x - lx
        const dy = pos.y - ly
        if (Math.sqrt(dx * dx + dy * dy) < 3 && Math.random() < 0.3) {
          const needs = this.em.getComponent<NeedsComponent>(id, 'needs')!
          needs.health -= 30
        }
      }
    }
  }

  private affectCreatures(): void {
    const entities = this.em.getEntitiesWithComponents('position', 'needs', 'creature')

    for (const id of entities) {
      const needs = this.em.getComponent<NeedsComponent>(id, 'needs')!
      const creature = this.em.getComponent<CreatureComponent>(id, 'creature')!

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
    }
  }
}
