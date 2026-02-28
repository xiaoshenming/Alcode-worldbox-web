// Creature Somniloquy System (v3.39) - Creatures talk in their sleep
// Sleep-talking reveals secrets, prophecies, or nonsense

import { EntityManager } from '../ecs/Entity'

export type SleepTalkType = 'secret' | 'prophecy' | 'nonsense' | 'memory' | 'warning' | 'confession'

export interface SleepTalk {
  id: number
  entityId: number
  talkType: SleepTalkType
  content: string
  significance: number  // 0-100
  tick: number
}

const CHECK_INTERVAL = 1000
const TALK_CHANCE = 0.01
const MAX_TALKS = 60

const TALK_TYPES: SleepTalkType[] = ['secret', 'prophecy', 'nonsense', 'memory', 'warning', 'confession']

const PHRASES: Record<SleepTalkType, string[]> = {
  secret: ['hidden treasure...', 'the king is...', 'behind the mountain...'],
  prophecy: ['darkness comes...', 'a hero will rise...', 'the stars align...'],
  nonsense: ['purple fish...', 'flying rocks...', 'dancing trees...'],
  memory: ['mother used to...', 'the old village...', 'when I was young...'],
  warning: ['beware the...', 'they are coming...', 'run from...'],
  confession: ['I stole the...', 'I never told...', 'forgive me for...'],
}

export class CreatureSomniloquySystem {
  private talks: SleepTalk[] = []
  private nextId = 1
  private lastCheck = 0
  private _recentBuf: SleepTalk[] = []

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateTalks(em, tick)
    this.cleanup()
  }

  private generateTalks(em: EntityManager, tick: number): void {
    if (this.talks.length >= MAX_TALKS) return

    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > TALK_CHANCE) continue
      if (this.talks.length >= MAX_TALKS) break

      const talkType = TALK_TYPES[Math.floor(Math.random() * TALK_TYPES.length)]
      const phrases = PHRASES[talkType]
      const content = phrases[Math.floor(Math.random() * phrases.length)]

      let significance: number
      switch (talkType) {
        case 'prophecy': significance = 60 + Math.random() * 40; break
        case 'secret': significance = 40 + Math.random() * 40; break
        case 'warning': significance = 50 + Math.random() * 30; break
        case 'confession': significance = 30 + Math.random() * 30; break
        case 'memory': significance = 10 + Math.random() * 30; break
        default: significance = Math.random() * 20; break
      }

      this.talks.push({
        id: this.nextId++,
        entityId: eid,
        talkType,
        content,
        significance,
        tick,
      })
    }
  }

  private cleanup(): void {
    if (this.talks.length > MAX_TALKS) {
      this.talks.sort((a, b) => b.significance - a.significance)
      this.talks.length = MAX_TALKS
    }
  }

  getTalks(): SleepTalk[] { return this.talks }
  getRecentTalks(count: number): SleepTalk[] {
    const buf = this._recentBuf
    buf.length = 0
    for (const t of this.talks) buf.push(t)
    buf.sort((a, b) => b.tick - a.tick)
    if (buf.length > count) buf.length = count
    return buf
  }
  private _propheciesBuf: SleepTalk[] = []
  getProphecies(): SleepTalk[] {
    this._propheciesBuf.length = 0
    for (const t of this.talks) { if (t.talkType === 'prophecy') this._propheciesBuf.push(t) }
    return this._propheciesBuf
  }
}
