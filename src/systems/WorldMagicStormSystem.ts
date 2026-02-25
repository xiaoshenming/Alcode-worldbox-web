// World Magic Storm System (v2.37) - Magical storms mutate terrain and creatures
// Arcane storms sweep across the map, transforming land and empowering/weakening beings
// Storm remnants leave behind enchanted zones

export type MagicStormType = 'arcane' | 'void' | 'elemental' | 'spirit' | 'chaos'

export interface MagicStorm {
  id: number
  type: MagicStormType
  x: number
  y: number
  radius: number
  intensity: number     // 1-10
  dx: number
  dy: number
  age: number
  maxAge: number
  mutationsApplied: number
}

export interface EnchantedZone {
  x: number
  y: number
  radius: number
  type: MagicStormType
  power: number
  decayAt: number
}

const SPAWN_INTERVAL = 3000
const MOVE_INTERVAL = 150
const MAX_STORMS = 4
const MAX_ZONES = 12
const STORM_SPEED = 0.4

let nextStormId = 1

const STORM_TYPES: MagicStormType[] = ['arcane', 'void', 'elemental', 'spirit', 'chaos']

export class WorldMagicStormSystem {
  private storms: MagicStorm[] = []
  private enchantedZones: EnchantedZone[] = []
  private lastSpawn = 0
  private lastMove = 0
  private worldWidth = 200
  private worldHeight = 200

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, tick: number): void {
    if (tick - this.lastSpawn >= SPAWN_INTERVAL) {
      this.lastSpawn = tick
      this.spawnStorm(tick)
    }
    if (tick - this.lastMove >= MOVE_INTERVAL) {
      this.lastMove = tick
      this.moveStorms(tick)
      this.cleanupZones(tick)
    }
  }

  private spawnStorm(tick: number): void {
    if (this.storms.length >= MAX_STORMS) return
    if (Math.random() > 0.4) return
    const type = STORM_TYPES[Math.floor(Math.random() * STORM_TYPES.length)]
    const edge = Math.floor(Math.random() * 4)
    let x: number, y: number, dx: number, dy: number
    switch (edge) {
      case 0: x = 0; y = Math.random() * this.worldHeight; dx = STORM_SPEED; dy = (Math.random() - 0.5) * 0.2; break
      case 1: x = this.worldWidth; y = Math.random() * this.worldHeight; dx = -STORM_SPEED; dy = (Math.random() - 0.5) * 0.2; break
      case 2: x = Math.random() * this.worldWidth; y = 0; dx = (Math.random() - 0.5) * 0.2; dy = STORM_SPEED; break
      default: x = Math.random() * this.worldWidth; y = this.worldHeight; dx = (Math.random() - 0.5) * 0.2; dy = -STORM_SPEED; break
    }
    this.storms.push({
      id: nextStormId++,
      type, x, y,
      radius: 8 + Math.floor(Math.random() * 8),
      intensity: 3 + Math.floor(Math.random() * 6),
      dx, dy,
      age: 0,
      maxAge: 200 + Math.floor(Math.random() * 300),
      mutationsApplied: 0,
    })
  }

  private moveStorms(tick: number): void {
    this.storms = this.storms.filter(s => {
      s.x += s.dx
      s.y += s.dy
      s.age++
      // Leave enchanted zone trail
      if (s.age % 50 === 0 && this.enchantedZones.length < MAX_ZONES) {
        this.enchantedZones.push({
          x: Math.floor(s.x), y: Math.floor(s.y),
          radius: Math.floor(s.radius * 0.6),
          type: s.type,
          power: Math.floor(s.intensity * 0.5),
          decayAt: tick + 5000,
        })
        s.mutationsApplied++
      }
      if (s.age >= s.maxAge) return false
      if (s.x < -20 || s.x > this.worldWidth + 20) return false
      if (s.y < -20 || s.y > this.worldHeight + 20) return false
      return true
    })
  }

  private cleanupZones(tick: number): void {
    this.enchantedZones = this.enchantedZones.filter(z => tick < z.decayAt)
  }

  getStorms(): MagicStorm[] {
    return this.storms
  }

  getEnchantedZones(): EnchantedZone[] {
    return this.enchantedZones
  }

  getStormCount(): number {
    return this.storms.length
  }
}
