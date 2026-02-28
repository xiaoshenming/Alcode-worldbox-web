// Creature Guild System (v2.21) - Creatures of same profession form guilds
// Guilds provide shared resource bonuses and skill boosts to members

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type GuildType = 'warriors' | 'hunters' | 'builders' | 'healers' | 'merchants'

export interface Guild {
  id: number
  type: GuildType
  name: string
  civId: number
  members: EntityId[]
  level: number           // 1-5
  experience: number      // toward next level
  hallX: number
  hallY: number
  founded: number         // tick
  bonus: number           // percentage bonus to members
  nameLabel: string       // Pre-computed "${name} Lv${level}" for render
}

const CHECK_INTERVAL = 800
const LEVEL_INTERVAL = 2000
const MAX_GUILDS = 20
const MIN_MEMBERS_TO_FORM = 3
const MAX_MEMBERS = 12
const EXP_PER_LEVEL = 100
const MAX_LEVEL = 5
const BONUS_PER_LEVEL = 5
const GUILD_RANGE = 15

const GUILD_NAMES: Record<GuildType, string[]> = {
  warriors: ['Iron Fist', 'Steel Guard', 'War Hammer'],
  hunters: ['Shadow Bow', 'Swift Arrow', 'Wild Track'],
  builders: ['Stone Mason', 'Grand Forge', 'Pillar'],
  healers: ['White Lotus', 'Life Spring', 'Mercy'],
  merchants: ['Gold Scale', 'Silk Road', 'Fair Deal'],
}

const GUILD_COLORS: Record<GuildType, string> = {
  warriors: '#c44',
  hunters: '#4a4',
  builders: '#ca8',
  healers: '#4cf',
  merchants: '#fc4',
}

let nextGuildId = 1

export class CreatureGuildSystem {
  private guilds: Guild[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextLevelTick = LEVEL_INTERVAL
  private _lastZoom = -1
  private _nameFont = ''

  private _activeGuildsBuf: Guild[] = []
  private _unguildedBuf: EntityId[] = []
  getGuilds(): Guild[] { return this.guilds }
  getActiveGuilds(): Guild[] {
    this._activeGuildsBuf.length = 0
    for (const g of this.guilds) { if (g.members.length > 0) this._activeGuildsBuf.push(g) }
    return this._activeGuildsBuf
  }

  getGuildForEntity(eid: EntityId): Guild | undefined {
    return this.guilds.find(g => g.members.includes(eid))
  }

  update(dt: number, em: EntityManager, tick: number): void {
    // Clean dead members
    for (const guild of this.guilds) {
      for (let i = guild.members.length - 1; i >= 0; i--) {
        const pos = em.getComponent<PositionComponent>(guild.members[i], 'position')
        if (!pos) guild.members.splice(i, 1)
      }
    }

    // Form new guilds
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      if (this.guilds.length < MAX_GUILDS) {
        this.tryFormGuild(em, tick)
      }
    }

    // Level up guilds
    if (tick >= this.nextLevelTick) {
      this.nextLevelTick = tick + LEVEL_INTERVAL
      for (const guild of this.guilds) {
        if (guild.members.length === 0) continue
        // Gain exp based on active members
        guild.experience += guild.members.length
        if (guild.experience >= EXP_PER_LEVEL && guild.level < MAX_LEVEL) {
          guild.experience -= EXP_PER_LEVEL
          guild.level++
          guild.bonus = guild.level * BONUS_PER_LEVEL
          guild.nameLabel = `${guild.name} Lv${guild.level}`
          EventLog.log('culture', `Guild "${guild.name}" reached level ${guild.level}!`, 0)
        }
      }
    }

    // Recruit nearby creatures
    if (tick % 500 === 0) {
      this.recruitMembers(em)
    }
  }

  private tryFormGuild(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')
    // Group by rough location (numeric key = cx * 10000 + cy)
    const clusters = new Map<number, EntityId[]>()
    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue
      const key = Math.floor(pos.x / GUILD_RANGE) * 10000 + Math.floor(pos.y / GUILD_RANGE)
      let group = clusters.get(key)
      if (!group) {
        group = []
        clusters.set(key, group)
      }
      group.push(eid)
    }

    for (const [, group] of clusters) {
      if (group.length < MIN_MEMBERS_TO_FORM) continue
      // Check if any are already in a guild
      this._unguildedBuf.length = 0
      for (const eid of group) { if (!this.getGuildForEntity(eid)) this._unguildedBuf.push(eid) }
      if (this._unguildedBuf.length < MIN_MEMBERS_TO_FORM) continue

      const guildType = this.pickGuildType()
      const names = GUILD_NAMES[guildType]
      const name = names[Math.floor(Math.random() * names.length)]
      const firstPos = em.getComponent<PositionComponent>(this._unguildedBuf[0], 'position')
      if (!firstPos) continue
      const members = this._unguildedBuf.slice(0, MAX_MEMBERS)

      const guild: Guild = {
        id: nextGuildId++,
        type: guildType,
        name,
        civId: 0,
        members,
        level: 1,
        experience: 0,
        hallX: firstPos.x,
        hallY: firstPos.y,
        founded: tick,
        bonus: BONUS_PER_LEVEL,
        nameLabel: `${name} Lv1`,
      }
      this.guilds.push(guild)
      EventLog.log('culture', `Guild "${name}" (${guildType}) founded with ${members.length} members`, 0)
      return
    }
  }

  private recruitMembers(em: EntityManager): void {
    for (const guild of this.guilds) {
      if (guild.members.length >= MAX_MEMBERS) continue
      const entities = em.getEntitiesWithComponents('position', 'creature')
      for (const eid of entities) {
        if (guild.members.length >= MAX_MEMBERS) break
        if (this.getGuildForEntity(eid)) continue
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - guild.hallX
        const dy = pos.y - guild.hallY
        if (dx * dx + dy * dy < GUILD_RANGE * GUILD_RANGE) {
          guild.members.push(eid)
        }
      }
    }
  }

  private pickGuildType(): GuildType {
    const types: GuildType[] = ['warriors', 'hunters', 'builders', 'healers', 'merchants']
    return types[Math.floor(Math.random() * types.length)]
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._nameFont = `${Math.max(8, 10 * zoom)}px monospace`
    }
    for (const guild of this.guilds) {
      if (guild.members.length === 0) continue
      const sx = (guild.hallX - camX) * zoom
      const sy = (guild.hallY - camY) * zoom
      if (sx < -50 || sy < -50 || sx > ctx.canvas.width + 50 || sy > ctx.canvas.height + 50) continue

      const color = GUILD_COLORS[guild.type]
      // Guild hall marker
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.fillRect(sx - 4 * zoom, sy - 4 * zoom, 8 * zoom, 8 * zoom)
      ctx.globalAlpha = 1

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = this._nameFont
      ctx.textAlign = 'center'
      ctx.fillText(guild.nameLabel, sx, sy - 6 * zoom)
      ctx.fillText(`${guild.members.length}/${MAX_MEMBERS}`, sx, sy + 12 * zoom)
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const active = this.getActiveGuilds()
    if (active.length === 0) return

    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 200, 20 + active.length * 18)
    ctx.fillStyle = '#fc4'
    ctx.font = '12px monospace'
    ctx.fillText(`Guilds (${active.length})`, x + 8, y + 14)

    active.forEach((g, i) => {
      ctx.fillStyle = GUILD_COLORS[g.type]
      ctx.fillText(`${g.name} Lv${g.level} [${g.members.length}]`, x + 8, y + 32 + i * 18)
    })
  }
}
