// World Weather Front System (v2.30) - Weather fronts move across the map
// Cold fronts, warm fronts, storm fronts affect regions differently
// Fronts collide to create extreme weather events

export type FrontType = 'cold' | 'warm' | 'storm' | 'dry' | 'humid'

export interface WeatherFront {
  id: number
  type: FrontType
  x: number
  y: number
  dx: number           // movement direction
  dy: number
  width: number        // front width in tiles
  length: number       // front length in tiles
  intensity: number    // 1-10
  age: number
  maxAge: number
}

export interface FrontCollision {
  frontA: number
  frontB: number
  x: number
  y: number
  severity: number
}

const MOVE_INTERVAL = 200
const SPAWN_INTERVAL = 1500
const MAX_FRONTS = 6
const FRONT_SPEED = 0.5
const COLLISION_DIST = 15

let nextFrontId = 1

const FRONT_LIST: FrontType[] = ['cold', 'warm', 'storm', 'dry', 'humid']

export class WorldWeatherFrontSystem {
  private fronts: WeatherFront[] = []
  private collisions: FrontCollision[] = []
  private lastMove = 0
  private lastSpawn = 0
  private worldWidth = 200
  private worldHeight = 200

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, tick: number): void {
    if (tick - this.lastSpawn >= SPAWN_INTERVAL) {
      this.lastSpawn = tick
      this.spawnFront(tick)
    }
    if (tick - this.lastMove >= MOVE_INTERVAL) {
      this.lastMove = tick
      this.moveFronts()
      this.detectCollisions()
      this.cleanupFronts()
    }
  }

  private spawnFront(tick: number): void {
    if (this.fronts.length >= MAX_FRONTS) return
    const type = FRONT_LIST[Math.floor(Math.random() * FRONT_LIST.length)]
    // Spawn from edges
    const edge = Math.floor(Math.random() * 4)
    let x: number, y: number, dx: number, dy: number
    switch (edge) {
      case 0: x = 0; y = Math.random() * this.worldHeight; dx = FRONT_SPEED; dy = (Math.random() - 0.5) * 0.3; break
      case 1: x = this.worldWidth; y = Math.random() * this.worldHeight; dx = -FRONT_SPEED; dy = (Math.random() - 0.5) * 0.3; break
      case 2: x = Math.random() * this.worldWidth; y = 0; dx = (Math.random() - 0.5) * 0.3; dy = FRONT_SPEED; break
      default: x = Math.random() * this.worldWidth; y = this.worldHeight; dx = (Math.random() - 0.5) * 0.3; dy = -FRONT_SPEED; break
    }
    this.fronts.push({
      id: nextFrontId++,
      type, x, y, dx, dy,
      width: 8 + Math.floor(Math.random() * 12),
      length: 20 + Math.floor(Math.random() * 30),
      intensity: 3 + Math.floor(Math.random() * 5),
      age: 0,
      maxAge: 300 + Math.floor(Math.random() * 200),
    })
  }

  private moveFronts(): void {
    for (const front of this.fronts) {
      front.x += front.dx
      front.y += front.dy
      front.age++
      // Slight intensity decay
      if (front.age > front.maxAge * 0.7) {
        front.intensity = Math.max(1, front.intensity - 0.1)
      }
    }
  }

  private detectCollisions(): void {
    this.collisions = []
    for (let i = 0; i < this.fronts.length; i++) {
      for (let j = i + 1; j < this.fronts.length; j++) {
        const a = this.fronts[i], b = this.fronts[j]
        const dx = a.x - b.x, dy = a.y - b.y
        if (dx * dx + dy * dy < COLLISION_DIST * COLLISION_DIST) {
          // Different front types colliding creates extreme weather
          if (a.type !== b.type) {
            this.collisions.push({
              frontA: a.id,
              frontB: b.id,
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              severity: Math.min(10, a.intensity + b.intensity),
            })
          }
        }
      }
    }
  }

  private cleanupFronts(): void {
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      const f = this.fronts[i]
      if (f.age >= f.maxAge || f.x < -20 || f.x > this.worldWidth + 20 || f.y < -20 || f.y > this.worldHeight + 20) {
        this.fronts.splice(i, 1)
      }
    }
  }
}
