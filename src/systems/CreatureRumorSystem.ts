// Creature Rumor System (v3.07) - Rumors spread between creatures
// Gossip about events, other creatures, and dangers propagates through social networks

import { EntityManager } from '../ecs/Entity'

export type RumorTopic = 'danger' | 'treasure' | 'betrayal' | 'hero' | 'monster' | 'miracle'

export interface Rumor {
  id: number
  topic: RumorTopic
  originId: number
  spreadCount: number
  distortion: number   // 0-100, how much the rumor changed
  believability: number // 0-100
  tick: number
}

const CHECK_INTERVAL = 700
const RUMOR_CHANCE = 0.025
const SPREAD_CHANCE = 0.1
const MAX_RUMORS = 80

const TOPIC_WEIGHTS: Record<RumorTopic, number> = {
  danger: 0.2, treasure: 0.15, betrayal: 0.15,
  hero: 0.2, monster: 0.15, miracle: 0.15,
}
const TOPICS = Object.keys(TOPIC_WEIGHTS) as RumorTopic[]

export class CreatureRumorSystem {
  private rumors: Rumor[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateRumors(em, tick)
    this.spreadRumors()
    this.pruneOld()
  }

  private generateRumors(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > RUMOR_CHANCE) continue
      const topic = this.pickTopic()
      this.rumors.push({
        id: this.nextId++,
        topic,
        originId: eid,
        spreadCount: 1,
        distortion: 0,
        believability: 40 + Math.random() * 50,
        tick,
      })
    }
  }

  private pickTopic(): RumorTopic {
    const r = Math.random()
    let cum = 0
    for (const t of TOPICS) {
      cum += TOPIC_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'danger'
  }

  private spreadRumors(): void {
    for (const rumor of this.rumors) {
      if (Math.random() > SPREAD_CHANCE) continue
      rumor.spreadCount++
      rumor.distortion = Math.min(100, rumor.distortion + Math.random() * 8)
      rumor.believability *= 0.98
    }
  }

  private pruneOld(): void {
    if (this.rumors.length > MAX_RUMORS) {
      this.rumors.splice(0, this.rumors.length - MAX_RUMORS)
    }
  }

}
