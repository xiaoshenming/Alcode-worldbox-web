// Simple particle system for visual effects

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export class ParticleSystem {
  particles: Particle[] = []

  spawn(x: number, y: number, count: number, color: string, spread: number = 2): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * spread + 0.5
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        color,
        size: 1 + Math.random() * 2
      })
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
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: 0,
        vy: 2 + Math.random(),
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color: '#4488ff',
        size: 1
      })
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // gravity
      p.life--

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }
}
