import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { TileType } from '../utils/Constants'

const LEAF_COLORS = ['#cc6622', '#dd8833', '#aa4411', '#eebb44']

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

// Sample a random tile position within viewport, optionally filtering by tile type
function sampleTile(
  world: World, vx: number, vy: number, vw: number, vh: number,
  types: TileType[] | null, maxAttempts: number = 8
): { x: number; y: number } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const x = Math.floor(rand(vx, vx + vw))
    const y = Math.floor(rand(vy, vy + vh))
    if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue
    if (!types || types.includes(world.tiles[y][x])) return { x, y }
  }
  return null
}

export class AmbientParticleSystem {
  update(
    world: World, particles: ParticleSystem, tick: number,
    viewportX: number, viewportY: number, viewportW: number, viewportH: number
  ): void {
    const season = world.season
    const isNight = !world.isDay()

    // Gravity in ParticleSystem is +0.05/tick, so vy for "no fall" needs ~-0.05 compensation

    // 1. Fireflies — night, spring/summer, forest/grass
    if (isNight && (season === 'spring' || season === 'summer') && tick % 10 === 0) {
      const count = randInt(1, 2)
      for (let i = 0; i < count; i++) {
        const pos = sampleTile(world, viewportX, viewportY, viewportW, viewportH,
          [TileType.FOREST, TileType.GRASS])
        if (pos) {
          particles.addParticle({
            x: pos.x + Math.random(), y: pos.y + Math.random(),
            vx: rand(-0.01, 0.01),
            vy: -0.05 + rand(-0.005, 0.005), // counteract gravity
            life: randInt(120, 200), maxLife: 200,
            color: '#aaff44', size: 1.5
          })
        }
      }
    }

    // 2. Falling leaves — autumn, forest
    if (season === 'autumn' && tick % 8 === 0) {
      const count = randInt(1, 3)
      for (let i = 0; i < count; i++) {
        const pos = sampleTile(world, viewportX, viewportY, viewportW, viewportH,
          [TileType.FOREST])
        if (pos) {
          particles.addParticle({
            x: pos.x + Math.random(), y: pos.y + Math.random(),
            vx: rand(0.01, 0.03),
            vy: -0.05 + rand(0.005, 0.015), // gravity will add downward drift
            life: randInt(150, 250), maxLife: 250,
            color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
            size: 1.5
          })
        }
      }
    }

    // 3. Snowflakes — winter, anywhere in viewport
    if (season === 'winter' && tick % 5 === 0) {
      const count = randInt(2, 4)
      for (let i = 0; i < count; i++) {
        const x = rand(viewportX, viewportX + viewportW)
        const y = rand(viewportY, viewportY + Math.min(viewportH * 0.3, 10)) // spawn near top
        // sin wobble baked into vx; gravity counteracted so net fall is slow
        const wobble = Math.sin(tick * 0.1 + i) * 0.01
        particles.addParticle({
          x, y,
          vx: wobble,
          vy: -0.05 + rand(0.008, 0.02), // net downward after gravity
          life: randInt(200, 350), maxLife: 350,
          color: '#ffffff', size: rand(1, 2)
        })
      }
    }

    // 4. Volcanic embers — lava tiles
    if (tick % 15 === 0) {
      const count = randInt(1, 2)
      for (let i = 0; i < count; i++) {
        const pos = sampleTile(world, viewportX, viewportY, viewportW, viewportH,
          [TileType.LAVA])
        if (pos) {
          particles.addParticle({
            x: pos.x + Math.random(), y: pos.y + Math.random(),
            vx: rand(-0.01, 0.01),
            vy: -0.05 + rand(-0.02, -0.05), // strong upward against gravity
            life: randInt(60, 120), maxLife: 120,
            color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
            size: rand(1, 2)
          })
        }
      }
    }

    // 5. Sand dust — sand tiles, doubled in summer
    const sandInterval = season === 'summer' ? 10 : 20
    if (tick % sandInterval === 0) {
      const pos = sampleTile(world, viewportX, viewportY, viewportW, viewportH,
        [TileType.SAND])
      if (pos) {
        particles.addParticle({
          x: pos.x + Math.random(), y: pos.y + Math.random(),
          vx: rand(0.02, 0.04),
          vy: -0.05 + rand(-0.005, 0.0), // slight upward, mostly horizontal
          life: randInt(80, 150), maxLife: 150,
          color: '#d4b896', size: 1
        })
      }
    }
  }
}
