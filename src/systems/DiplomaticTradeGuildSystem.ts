// Diplomatic Trade Guild System (v3.73) - Civilizations form trade guilds
// Guilds regulate commerce, set prices, and create economic alliances

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type GuildType = 'merchants' | 'artisans' | 'miners' | 'farmers' | 'sailors' | 'bankers'

export interface TradeGuild {
  id: number
  name: string
  guildType: GuildType
  memberCivs: number[]
  influence: number
  wealth: number
  regulations: number
  tick: number
}

const CHECK_INTERVAL = 1500
const FORM_CHANCE = 0.003
const MAX_GUILDS = 40
const GUILD_TYPES: GuildType[] = ['merchants', 'artisans', 'miners', 'farmers', 'sailors', 'bankers']

const GUILD_NAMES = [
  'Golden Scale', 'Iron Compass', 'Silver Thread', 'Jade Hammer',
  'Crimson Sail', 'Azure Coin', 'Emerald Plow', 'Obsidian Pick',
]

export class DiplomaticTradeGuildSystem {
  private _civsBuf: Civilization[] = []
  private _usedIdxSet: Set<number> = new Set()
  private guilds: TradeGuild[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Form new guilds
    if (this.guilds.length < MAX_GUILDS && Math.random() < FORM_CHANCE) {
      const guildType = GUILD_TYPES[Math.floor(Math.random() * GUILD_TYPES.length)]
      const name = GUILD_NAMES[Math.floor(Math.random() * GUILD_NAMES.length)]
      const memberCount = 2 + Math.floor(Math.random() * Math.min(3, civs.length - 1))
      // 随机选择 memberCount 个文明（零分配，Fisher-Yates partial shuffle 思路）
      const memberCivs: number[] = []
      const used = this._usedIdxSet; used.clear()
      while (memberCivs.length < memberCount) {
        const idx = Math.floor(Math.random() * civs.length)
        if (!used.has(idx)) { used.add(idx); memberCivs.push(civs[idx].id) }
      }

      this.guilds.push({
        id: this.nextId++,
        name: `${name} Guild`,
        guildType,
        memberCivs,
        influence: 10 + Math.random() * 30,
        wealth: 20 + Math.random() * 50,
        regulations: Math.random() * 40,
        tick,
      })
    }

    // Update existing guilds
    for (const guild of this.guilds) {
      guild.wealth += (guild.memberCivs.length * 0.1 - 0.3)
      guild.influence = Math.min(100, guild.influence + 0.02)
      if (guild.wealth < 0) guild.wealth = 0
    }

    // Dissolve bankrupt guilds
    const cutoff = tick - 60000
    for (let i = this.guilds.length - 1; i >= 0; i--) {
      const g = this.guilds[i]
      if (g.wealth <= 0 || g.tick < cutoff) {
        this.guilds.splice(i, 1)
      }
    }
  }

  getGuilds(): readonly TradeGuild[] { return this.guilds }
}
