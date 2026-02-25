// Pooled particle system for visual effects

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  active: boolean
}

export class ParticleSystem {
  private pool: Particle[] = []
  private activeCount: number = 0
  private readonly MAX_PARTICLES = 500

  // External rendering iterates this — returns only active particles
  get particles(): Particle[] {
    return this.pool.slice(0, this.activeCount)
  }

  private allocate(x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string, size: number): void {
    if (this.activeCount < this.pool.length) {
      // Reuse inactive slot at the end of active region
      const p = this.pool[this.activeCount]
      p.x = x; p.y = y; p.vx = vx; p.vy = vy
      p.life = life; p.maxLife = maxLife; p.color = color; p.size = size
      p.active = true
      this.activeCount++
    } else if (this.pool.length < this.MAX_PARTICLES) {
      // Grow pool
      this.pool.push({ x, y, vx, vy, life, maxLife, color, size, active: true })
      this.activeCount++
    } else {
      // Pool full — overwrite oldest active particle (index 0)
      const p = this.pool[0]
      p.x = x; p.y = y; p.vx = vx; p.vy = vy
      p.life = life; p.maxLife = maxLife; p.color = color; p.size = size
      p.active = true
    }
  }

  // Direct particle add — replaces external .particles.push() usage
  addParticle(p: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }): void {
    this.allocate(p.x, p.y, p.vx, p.vy, p.life, p.maxLife, p.color, p.size)
  }

  spawn(x: number, y: number, count: number, color: string, spread: number = 2): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * spread + 0.5
      this.allocate(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        30 + Math.random() * 30,
        60,
        color,
        1 + Math.random() * 2
      )
    }
  }

  spawnExplosion(x: number, y: number): void {
    this.spawn(x, y, 20, '#ff4400', 3)
    this.spawn(x, y, 15, '#ffaa00', 2)
    this.spawn(x, y, 10, '#ffff00', 1)
  }

  spawnDeath(x: number, y: number, color: string): void {
    this.spawn(x, y, 8, color, 1.5)
    this.spawn(x, y, 5, '#880000', 1)
  }

  spawnBirth(x: number, y: number, color: string): void {
    this.spawn(x, y, 6, color, 0.8)
    this.spawn(x, y, 4, '#ffffff', 0.5)
  }

  spawnRain(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.allocate(
        x + (Math.random() - 0.5) * 20,
        y,
        0,
        2 + Math.random(),
        20 + Math.random() * 20,
        40,
        '#4488ff',
        1
      )
    }
  }

  /** Firework burst — particles radiate outward from center, used for celebrations */
  spawnFirework(x: number, y: number, color: string): void {
    const count = 16
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 1.5 + Math.random() * 1.5
      this.allocate(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 1, // slight upward bias
        40 + Math.random() * 20,
        60,
        color,
        1.5 + Math.random() * 1.5
      )
    }
    // Inner sparkle ring
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3
      this.allocate(
        x, y,
        Math.cos(angle) * 0.8,
        Math.sin(angle) * 0.8 - 0.5,
        25 + Math.random() * 15,
        40,
        '#ffffff',
        1 + Math.random()
      )
    }
  }

  /** Trail effect — small fading dot behind a moving entity */
  spawnTrail(x: number, y: number, color: string): void {
    this.allocate(
      x + (Math.random() - 0.5) * 0.3,
      y + (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      12 + Math.random() * 8,
      20,
      color,
      1 + Math.random() * 0.8
    )
  }

  /** Aura effect — ring of faint particles orbiting a position */
  spawnAura(x: number, y: number, color: string, radius: number): void {
    const count = 3
    const baseAngle = performance.now() * 0.002
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius
      this.allocate(
        px, py,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        10 + Math.random() * 6,
        16,
        color,
        0.8 + Math.random() * 0.5
      )
    }
  }

  update(): void {
    // Swap-and-pop: iterate active region, swap dead particles to end
    let i = 0
    while (i < this.activeCount) {
      const p = this.pool[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // gravity
      p.life--

      if (p.life <= 0) {
        p.active = false
        // Swap with last active particle
        this.activeCount--
        if (i < this.activeCount) {
          this.pool[i] = this.pool[this.activeCount]
          this.pool[this.activeCount] = p
        }
        // Don't increment i — need to process the swapped-in particle
      } else {
        i++
      }
    }
  }
}
