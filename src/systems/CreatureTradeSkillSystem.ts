// Creature Trade Skill System (v2.31) - Creatures develop trade skills
// Bartering, negotiation, appraisal skills improve civ economy
// Skilled traders generate more resources from trade routes

import { EntityManager, EntityId } from '../ecs/Entity'

export type TradeSkillType = 'bartering' | 'negotiation' | 'appraisal' | 'logistics' | 'diplomacy'

export interface CreatureTradeSkill {
  entityId: EntityId
  skills: Partial<Record<TradeSkillType, number>>  // 0-100
  totalTrades: number
  profitGenerated: number
  lastTradeAt: number
}

const CHECK_INTERVAL = 700
const TRAIN_INTERVAL = 500
const SKILL_GAIN = 3
const MAX_SKILL = 100
const MAX_TRADERS = 150

const TRADE_SKILL_LIST: TradeSkillType[] = ['bartering', 'negotiation', 'appraisal', 'logistics', 'diplomacy']

export class CreatureTradeSkillSystem {
  private traders: Map<EntityId, CreatureTradeSkill> = new Map()
  private lastCheck = 0
  private lastTrain = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.assignTraders(em, tick)
    }
    if (tick - this.lastTrain >= TRAIN_INTERVAL) {
      this.lastTrain = tick
      this.trainSkills(em, tick)
    }
  }

  private assignTraders(em: EntityManager, tick: number): void {
    if (this.traders.size >= MAX_TRADERS) return
    const creatures = em.getEntitiesWithComponents('creature', 'position', 'civMember')
    for (const id of creatures) {
      if (this.traders.has(id)) continue
      if (this.traders.size >= MAX_TRADERS) break
      if (Math.random() > 0.06) continue
      const primary = TRADE_SKILL_LIST[Math.floor(Math.random() * TRADE_SKILL_LIST.length)]
      const skills: Partial<Record<TradeSkillType, number>> = {}
      skills[primary] = 10 + Math.floor(Math.random() * 20)
      // Secondary skill
      if (Math.random() < 0.4) {
        const secondary = TRADE_SKILL_LIST[Math.floor(Math.random() * TRADE_SKILL_LIST.length)]
        if (secondary !== primary) skills[secondary] = 5 + Math.floor(Math.random() * 10)
      }
      this.traders.set(id, {
        entityId: id,
        skills,
        totalTrades: 0,
        profitGenerated: 0,
        lastTradeAt: tick,
      })
    }
  }

  private trainSkills(em: EntityManager, tick: number): void {
    for (const [id, trader] of this.traders) {
      if (!em.getComponent(id, 'creature')) {
        this.traders.delete(id)
        continue
      }
      // Improve skills through practice
      for (const skill of TRADE_SKILL_LIST) {
        if (trader.skills[skill] !== undefined) {
          trader.skills[skill] = Math.min(MAX_SKILL, (trader.skills[skill] ?? 0) + SKILL_GAIN)
        }
      }
      // Simulate trade activity
      if (Math.random() < 0.15) {
        trader.totalTrades++
        const avgSkill = this.getAverageSkill(trader)
        trader.profitGenerated += Math.floor(avgSkill * 0.5)
        trader.lastTradeAt = tick
      }
    }
  }

  private getAverageSkill(trader: CreatureTradeSkill): number {
    let sum = 0, count = 0
    for (const k of TRADE_SKILL_LIST) {
      const v = trader.skills[k]
      if (v !== undefined) { sum += v; count++ }
    }
    return count === 0 ? 0 : sum / count
  }

  getTraders(): Map<EntityId, CreatureTradeSkill> {
    return this.traders
  }

}
