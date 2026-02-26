// World Mythic Beast System (v2.20) - Legendary creatures roam the world
// Mythic beasts are powerful entities that terrorize or protect regions

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type BeastType = 'phoenix' | 'leviathan' | 'behemoth' | 'griffin' | 'hydra'

export interface MythicBeast {
  id: number
  type: BeastType
  name: string
  x: number
  y: number
  health: number
  maxHealth: number
  damage: number
  speed: number
  territory: number       // radius
  hostile: boolean
  killCount: number
  spawnTick: number
  targetX: number
  targetY: number
  moveTimer: number
}

interface WorldLike {
  tick: number
  width: number
  height: number
  getTile(x: number, y: number): number | null
}

const SPAWN_INTERVAL = 6000
const MOVE_INTERVAL = 200
const ATTACK_INTERVAL = 300
const MAX_BEASTS = 4
const ATTACK_RANGE = 5
const ROAM_RANGE = 30

const BEAST_TYPES: BeastType[] = ['phoenix', 'leviathan', 'behemoth', 'griffin', 'hydra']

const BEAST_NAMES: Record<BeastType, string[]> = {
  phoenix: ['Ignis', 'Solara', 'Pyraxis'],
  leviathan: ['Abyssal', 'Tideborn', 'Deepmaw'],
  behemoth: ['Ironhide', 'Earthshaker', 'Colossus'],
  griffin: ['Skytalon', 'Windclaw', 'Stormwing'],
  hydra: ['Venomfang', 'Manyhead', 'Toxicore'],
}

const BEAST_COLORS: Record<BeastType, string> = {
  phoenix: '#f80',
  leviathan: '#08f',
  behemoth: '#840',
  griffin: '#ff0',
  hydra: '#0f8',
}

const BEAST_STATS: Record<BeastType, { hp: number; dmg: number; spd: number; territory: number }> = {
  phoenix: { hp: 500, dmg: 25, spd: 1.5, territory: 20 },
  leviathan: { hp: 800, dmg: 30, spd: 0.8, territory: 25 },
  behemoth: { hp: 1000, dmg: 40, spd: 0.5, territory: 15 },
  griffin: { hp: 400, dmg: 20, spd: 2.0, territory: 30 },
  hydra: { hp: 700, dmg: 35, spd: 0.7, territory: 18 },
}

let nextBeastId = 1

export class WorldMythicBeastSystem {
  private beasts: MythicBeast[] = []
  private nextSpawnTick = SPAWN_INTERVAL
  private nextMoveTick = MOVE_INTERVAL
  private nextAttackTick = ATTACK_INTERVAL

  getBeasts(): MythicBeast[] { return this.beasts }
  getAliveBeasts(): MythicBeast[] { return this.beasts.filter(b => b.health > 0) }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Remove dead beasts
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      if (this.beasts[i].health <= 0) {
        const b = this.beasts[i]
        EventLog.log('world_event', `The mythic ${b.name} (${b.type}) has been slain! Kills: ${b.killCount}`, tick)
        this.beasts.splice(i, 1)
      }
    }

    // Spawn new beasts
    if (tick >= this.nextSpawnTick && this.beasts.length < MAX_BEASTS) {
      this.nextSpawnTick = tick + SPAWN_INTERVAL
      this.spawnBeast(world, tick)
    }

    // Move beasts
    if (tick >= this.nextMoveTick) {
      this.nextMoveTick = tick + MOVE_INTERVAL
      this.moveBeasts(world)
    }

    // Attack nearby creatures
    if (tick >= this.nextAttackTick) {
      this.nextAttackTick = tick + ATTACK_INTERVAL
      this.attackNearby(em, tick)
    }
  }

  private spawnBeast(world: WorldLike, tick: number): void {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = 10 + Math.floor(Math.random() * (world.width - 20))
      const y = 10 + Math.floor(Math.random() * (world.height - 20))
      const tile = world.getTile(x, y)
      if (tile === null) continue

      const type = BEAST_TYPES[Math.floor(Math.random() * BEAST_TYPES.length)]

      // Leviathan needs water
      if (type === 'leviathan' && tile > 1) continue
      // Others need land
      if (type !== 'leviathan' && tile < 2) continue

      const tooClose = this.beasts.some(b => {
        const dx = b.x - x, dy = b.y - y
        return dx * dx + dy * dy < 1600
      })
      if (tooClose) continue

      const stats = BEAST_STATS[type]
      const names = BEAST_NAMES[type]
      const name = names[Math.floor(Math.random() * names.length)]
      const hostile = Math.random() < 0.7

      const beast: MythicBeast = {
        id: nextBeastId++,
        type, name,
        x, y,
        health: stats.hp,
        maxHealth: stats.hp,
        damage: stats.dmg,
        speed: stats.spd,
        territory: stats.territory,
        hostile,
        killCount: 0,
        spawnTick: tick,
        targetX: x,
        targetY: y,
        moveTimer: 0,
      }
      this.beasts.push(beast)
      EventLog.log('world_event', `A ${hostile ? 'hostile' : 'peaceful'} ${name} the ${type} appeared at (${x},${y})!`, tick)
      return
    }
  }

  private moveBeasts(world: WorldLike): void {
    for (const beast of this.beasts) {
      beast.moveTimer--
      if (beast.moveTimer <= 0) {
        beast.moveTimer = 5 + Math.floor(Math.random() * 10)
        beast.targetX = beast.x + (Math.random() - 0.5) * ROAM_RANGE
        beast.targetY = beast.y + (Math.random() - 0.5) * ROAM_RANGE
        beast.targetX = Math.max(1, Math.min(world.width - 2, beast.targetX))
        beast.targetY = Math.max(1, Math.min(world.height - 2, beast.targetY))
      }

      const dx = beast.targetX - beast.x
      const dy = beast.targetY - beast.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0.5) {
        beast.x += (dx / dist) * beast.speed * 0.3
        beast.y += (dy / dist) * beast.speed * 0.3
      }
    }
  }

  private attackNearby(em: EntityManager, tick: number): void {
    const hostileBeasts = this.beasts.filter(b => b.hostile)
    if (hostileBeasts.length === 0) return

    const entities = em.getEntitiesWithComponents('position', 'creature', 'needs')
    for (const beast of hostileBeasts) {
      const r2 = ATTACK_RANGE * ATTACK_RANGE
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        if (!pos || !needs) continue

        const dx = pos.x - beast.x, dy = pos.y - beast.y
        if (dx * dx + dy * dy > r2) continue

        needs.health -= beast.damage
        if (needs.health <= 0) {
          beast.killCount++
        }

        // Beast takes some damage from defenders
        beast.health -= Math.floor(Math.random() * 5)
        break // One attack per tick
      }
    }

    // Phoenix regeneration
    for (const beast of this.beasts) {
      if (beast.type === 'phoenix' && beast.health < beast.maxHealth) {
        beast.health = Math.min(beast.maxHealth, beast.health + 3)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.beasts.length === 0) return
    ctx.save()

    const time = Date.now() * 0.003

    for (const beast of this.beasts) {
      const sx = (beast.x * 16 - camX) * zoom
      const sy = (beast.y * 16 - camY) * zoom
      if (sx < -80 || sy < -80 || sx > ctx.canvas.width + 80 || sy > ctx.canvas.height + 80) continue

      const color = BEAST_COLORS[beast.type]
      const size = 8 * zoom

      // Territory circle
      ctx.globalAlpha = 0.08
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, beast.territory * 16 * zoom, 0, Math.PI * 2)
      ctx.fill()

      // Beast body
      ctx.globalAlpha = 0.9
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()

      // Pulsing aura
      const pulse = 0.3 + 0.2 * Math.sin(time + beast.id * 1.5)
      ctx.globalAlpha = pulse
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx, sy, size * 1.5, 0, Math.PI * 2)
      ctx.stroke()

      // Health bar
      ctx.globalAlpha = 0.8
      const barW = 20 * zoom
      const barH = 3 * zoom
      const barX = sx - barW / 2
      const barY = sy - size - 6 * zoom
      ctx.fillStyle = '#300'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = beast.health > beast.maxHealth * 0.3 ? '#0f0' : '#f00'
      ctx.fillRect(barX, barY, barW * (beast.health / beast.maxHealth), barH)

      // Name label
      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(8, 9 * zoom)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(beast.name, sx, sy + size + 10 * zoom)

      // Type icon
      ctx.fillStyle = color
      ctx.font = `${Math.max(10, 12 * zoom)}px monospace`
      ctx.fillText(beast.type[0].toUpperCase(), sx, sy + 4 * zoom)

      // Hostile indicator
      if (beast.hostile) {
        ctx.fillStyle = '#f00'
        ctx.font = `${Math.max(6, 7 * zoom)}px monospace`
        ctx.fillText('!', sx + size, sy - size)
      }
    }
    ctx.restore()
  }
}
