// Creature Ambition System (v2.38) - Creatures have personal ambitions
// Ambitions: become leader, build monument, explore unknown, master craft, defeat rival
// Fulfilling ambitions grants permanent buffs and fame

import { EntityManager, EntityId, CreatureComponent } from '../ecs/Entity'

export type AmbitionType = 'become_leader' | 'build_monument' | 'explore_unknown' | 'master_craft' | 'defeat_rival' | 'amass_wealth'

export interface CreatureAmbition {
  entityId: EntityId
  ambition: AmbitionType
  progress: number      // 0-100
  startedAt: number
  fulfilled: boolean
  reward: string
}

const CHECK_INTERVAL = 800
const PROGRESS_INTERVAL = 500
const MAX_AMBITIONS = 150
const PROGRESS_GAIN = 2
const FULFILL_CHANCE = 0.05

const AMBITION_LIST: AmbitionType[] = ['become_leader', 'build_monument', 'explore_unknown', 'master_craft', 'defeat_rival', 'amass_wealth']

const AMBITION_REWARDS: Record<AmbitionType, string[]> = {
  become_leader: ['Charisma +10', 'Influence +15', 'Authority +20'],
  build_monument: ['Legacy +10', 'Fame +15', 'Crafting +10'],
  explore_unknown: ['Wisdom +10', 'Speed +5', 'Vision +15'],
  master_craft: ['Skill +20', 'Precision +10', 'Efficiency +15'],
  defeat_rival: ['Strength +15', 'Courage +10', 'Reputation +20'],
  amass_wealth: ['Trade +15', 'Luck +10', 'Prosperity +20'],
}

export class CreatureAmbitionSystem {
  private ambitions: Map<EntityId, CreatureAmbition> = new Map()
  private lastCheck = 0
  private lastProgress = 0
  private fulfilledCount = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.assignAmbitions(em, tick)
    }
    if (tick - this.lastProgress >= PROGRESS_INTERVAL) {
      this.lastProgress = tick
      this.updateProgress(em, tick)
    }
  }

  private assignAmbitions(em: EntityManager, tick: number): void {
    if (this.ambitions.size >= MAX_AMBITIONS) return
    const creatures = em.getEntitiesWithComponents('creature')
    for (const id of creatures) {
      if (this.ambitions.has(id)) continue
      if (this.ambitions.size >= MAX_AMBITIONS) break
      if (Math.random() > 0.06) continue
      const ambition = AMBITION_LIST[Math.floor(Math.random() * AMBITION_LIST.length)]
      const rewards = AMBITION_REWARDS[ambition]
      this.ambitions.set(id, {
        entityId: id,
        ambition,
        progress: 0,
        startedAt: tick,
        fulfilled: false,
        reward: rewards[Math.floor(Math.random() * rewards.length)],
      })
    }
  }

  private updateProgress(em: EntityManager, tick: number): void {
    for (const [id, amb] of this.ambitions) {
      if (!em.getComponent(id, 'creature')) {
        this.ambitions.delete(id)
        continue
      }
      if (amb.fulfilled) continue
      amb.progress = Math.min(100, amb.progress + PROGRESS_GAIN + Math.floor(Math.random() * 3))
      // Check fulfillment
      if (amb.progress >= 100 && Math.random() < FULFILL_CHANCE) {
        amb.fulfilled = true
        this.fulfilledCount++
      }
    }
  }

  getAmbition(id: EntityId): CreatureAmbition | undefined {
    return this.ambitions.get(id)
  }

  getAmbitions(): Map<EntityId, CreatureAmbition> {
    return this.ambitions
  }

  getAmbitionCount(): number {
    return this.ambitions.size
  }

  getFulfilledCount(): number {
    return this.fulfilledCount
  }
}
