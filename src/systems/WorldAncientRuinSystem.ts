// World Ancient Ruin System (v2.25) - Explorable ancient ruins scattered across the world
// Creatures discover ruins and gain treasures, knowledge, or face dangers

import { EntityManager, EntityId, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type RuinType = 'temple' | 'library' | 'vault' | 'tomb' | 'fortress'
const RUIN_TYPES: RuinType[] = ['temple', 'library', 'vault', 'tomb', 'fortress']
export type RuinReward = 'treasure' | 'knowledge' | 'artifact' | 'curse' | 'nothing'

export interface AncientRuin {
  id: number
  type: RuinType
  name: string
  x: number
  y: number
  explored: boolean
  exploredBy: EntityId | null
  dangerLevel: number     // 1-5
  reward: RuinReward
  rewardValue: number
  discoveredTick: number
  exploredTick: number
  dangerLabel: string     // Pre-computed "Danger: ${dangerLevel}" for render
  /** Pre-computed panel row string — avoids template literal per frame */
  panelStr: string
}

const SPAWN_INTERVAL = 4000
const EXPLORE_RANGE = 4
const MAX_RUINS = 20
const EXPLORE_CHECK = 500

const RUIN_NAMES: Record<RuinType, string[]> = {
  temple: ['Sunken Temple', 'Sky Shrine', 'Moon Altar'],
  library: ['Lost Archive', 'Sage Hall', 'Scroll Vault'],
  vault: ['Dragon Hoard', 'King\'s Cache', 'Hidden Trove'],
  tomb: ['Ancient Crypt', 'Pharaoh\'s Rest', 'Shadow Tomb'],
  fortress: ['Iron Bastion', 'Storm Keep', 'War Citadel'],
}

const RUIN_COLORS: Record<RuinType, string> = {
  temple: '#fc4',
  library: '#4cf',
  vault: '#ff0',
  tomb: '#a6a',
  fortress: '#888',
}

const RUIN_REWARDS: Record<RuinType, RuinReward[]> = {
  temple: ['treasure', 'artifact', 'curse'],
  library: ['knowledge', 'knowledge', 'nothing'],
  vault: ['treasure', 'treasure', 'artifact'],
  tomb: ['artifact', 'curse', 'treasure'],
  fortress: ['treasure', 'nothing', 'artifact'],
}

let nextRuinId = 1

interface WorldLike {
  tick: number
  width: number
  height: number
  getTile(x: number, y: number): number | null
}

export class WorldAncientRuinSystem {
  private ruins: AncientRuin[] = []
  private nextSpawnTick = SPAWN_INTERVAL
  private nextExploreTick = EXPLORE_CHECK
  private _lastZoom = -1
  private _nameFont = ''
  private _unexploredBuf: AncientRuin[] = []
  /** Pre-computed panel header — rebuilt when unexplored or total count changes */
  private _prevUnexploredCount = -1
  private _prevRuinCount = -1
  private _ruinHeaderStr = 'Ruins (0/0)'
  getUnexplored(): AncientRuin[] {
    this._unexploredBuf.length = 0
    for (const r of this.ruins) { if (!r.explored) this._unexploredBuf.push(r) }
    return this._unexploredBuf
  }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Spawn new ruins
    if (tick >= this.nextSpawnTick) {
      this.nextSpawnTick = tick + SPAWN_INTERVAL
      if (this.ruins.length < MAX_RUINS && Math.random() < 0.35) {
        this.spawnRuin(world, tick)
      }
    }

    // Check for exploration
    if (tick >= this.nextExploreTick) {
      this.nextExploreTick = tick + EXPLORE_CHECK
      this.checkExploration(em, tick)
    }
  }

  private spawnRuin(world: WorldLike, tick: number): void {
    const types = RUIN_TYPES
    const type = types[Math.floor(Math.random() * types.length)]
    const names = RUIN_NAMES[type]
    const name = names[Math.floor(Math.random() * names.length)]
    const x = 5 + Math.floor(Math.random() * (world.width - 10))
    const y = 5 + Math.floor(Math.random() * (world.height - 10))

    // Don't spawn on water
    const tile = world.getTile(x, y)
    if (tile !== null && tile <= 1) return

    const dangerLevel = 1 + Math.floor(Math.random() * 5)
    const rewards = RUIN_REWARDS[type]
    const reward = rewards[Math.floor(Math.random() * rewards.length)]

    const ruin: AncientRuin = {
      id: nextRuinId++,
      type,
      name,
      x, y,
      explored: false,
      exploredBy: null,
      dangerLevel,
      reward,
      rewardValue: dangerLevel * 10 + Math.floor(Math.random() * 50),
      discoveredTick: tick,
      exploredTick: 0,
      dangerLabel: `Danger: ${dangerLevel}`,
      panelStr: `${name} danger:${dangerLevel}`,
    }
    this.ruins.push(ruin)
    EventLog.log('world_event', `Ancient ruin "${name}" (${type}) discovered!`, 0)
  }

  private checkExploration(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')
    for (const ruin of this.ruins) {
      if (ruin.explored) continue
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - ruin.x
        const dy = pos.y - ruin.y
        if (dx * dx + dy * dy < EXPLORE_RANGE * EXPLORE_RANGE) {
          this.exploreRuin(ruin, eid, em, tick)
          break
        }
      }
    }
  }

  private exploreRuin(ruin: AncientRuin, eid: EntityId, em: EntityManager, tick: number): void {
    ruin.explored = true
    ruin.exploredBy = eid
    ruin.exploredTick = tick
    ruin.panelStr = `${ruin.name} explored`

    const needs = em.getComponent<NeedsComponent>(eid, 'needs')

    switch (ruin.reward) {
      case 'treasure':
        EventLog.log('world_event', `Explorer found treasure in "${ruin.name}" worth ${ruin.rewardValue}!`, 0)
        break
      case 'knowledge':
        EventLog.log('world_event', `Explorer gained ancient knowledge from "${ruin.name}"!`, 0)
        break
      case 'artifact':
        EventLog.log('world_event', `Explorer found a powerful artifact in "${ruin.name}"!`, 0)
        break
      case 'curse':
        if (needs) {
          needs.health = Math.max(1, needs.health - ruin.dangerLevel * 10)
        }
        EventLog.log('world_event', `Explorer was cursed in "${ruin.name}"!`, 0)
        break
      case 'nothing':
        EventLog.log('world_event', `"${ruin.name}" was empty...`, 0)
        break
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._nameFont = `${Math.max(7, 9 * zoom)}px monospace`
    }
    for (const ruin of this.ruins) {
      const sx = (ruin.x - camX) * zoom
      const sy = (ruin.y - camY) * zoom
      if (sx < -30 || sy < -30 || sx > ctx.canvas.width + 30 || sy > ctx.canvas.height + 30) continue

      const color = RUIN_COLORS[ruin.type]
      const size = 5 * zoom

      if (ruin.explored) {
        ctx.globalAlpha = 0.3
      }

      // Ruin marker (diamond shape)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(sx, sy - size)
      ctx.lineTo(sx + size, sy)
      ctx.lineTo(sx, sy + size)
      ctx.lineTo(sx - size, sy)
      ctx.closePath()
      ctx.fill()

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = this._nameFont
      ctx.textAlign = 'center'
      ctx.fillText(ruin.name, sx, sy - size - 3)
      if (!ruin.explored) {
        ctx.fillStyle = '#f84'
        ctx.fillText(ruin.dangerLabel, sx, sy + size + 10)
      }
      ctx.globalAlpha = 1
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const unexplored = this.getUnexplored()
    if (this.ruins.length === 0) return

    const rows = Math.min(this.ruins.length, 5)
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 220, 20 + rows * 18)
    ctx.fillStyle = '#fc4'
    ctx.font = '12px monospace'
    if (unexplored.length !== this._prevUnexploredCount || this.ruins.length !== this._prevRuinCount) { this._prevUnexploredCount = unexplored.length; this._prevRuinCount = this.ruins.length; this._ruinHeaderStr = `Ruins (${unexplored.length}/${this.ruins.length})` }
    ctx.fillText(this._ruinHeaderStr, x + 8, y + 14)

    for (let i = 0; i < Math.min(5, this.ruins.length); i++) {
      const r = this.ruins[i]
      ctx.fillStyle = r.explored ? '#666' : RUIN_COLORS[r.type]
      ctx.fillText(r.panelStr, x + 8, y + 32 + i * 18)
    }
  }
}
