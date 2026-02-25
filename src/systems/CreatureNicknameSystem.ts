// Creature Nickname System (v3.24) - Creatures earn nicknames
// Based on behavior and achievements, creatures gain titles and fame

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type NicknameTitle = 'the Brave' | 'the Wise' | 'the Cruel' | 'the Swift' | 'the Lucky' | 'the Cursed' | 'the Builder' | 'the Wanderer'

export interface Nickname {
  id: number
  entityId: number
  name: NicknameTitle
  reason: string
  fame: number  // 0-100
  tick: number
}

const CHECK_INTERVAL = 1000
const NICKNAME_CHANCE = 0.01
const MAX_NICKNAMES = 100

const TITLES: NicknameTitle[] = [
  'the Brave', 'the Wise', 'the Cruel', 'the Swift',
  'the Lucky', 'the Cursed', 'the Builder', 'the Wanderer',
]

const REASONS: Record<NicknameTitle, string> = {
  'the Brave': 'survived many battles',
  'the Wise': 'lived to old age',
  'the Cruel': 'known for aggression',
  'the Swift': 'remarkably fast',
  'the Lucky': 'escaped death many times',
  'the Cursed': 'plagued by misfortune',
  'the Builder': 'constructed many structures',
  'the Wanderer': 'traveled great distances',
}

export class CreatureNicknameSystem {
  private nicknames: Nickname[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.assignNicknames(em, tick)
    this.evolveFame()
    this.cleanup()
  }

  private assignNicknames(em: EntityManager, tick: number): void {
    if (this.nicknames.length >= MAX_NICKNAMES) return

    const entities = em.getEntitiesWithComponents('creature')
    for (const eid of entities) {
      if (Math.random() > NICKNAME_CHANCE) continue
      if (this.hasNickname(eid)) continue

      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      // Pick a title based on creature attributes
      let title: NicknameTitle
      if (creature.age > creature.maxAge * 0.7) {
        title = 'the Wise'
      } else if (creature.speed > 3) {
        title = 'the Swift'
      } else if (creature.isHostile) {
        title = 'the Cruel'
      } else {
        title = TITLES[Math.floor(Math.random() * TITLES.length)]
      }

      this.nicknames.push({
        id: this.nextId++,
        entityId: eid,
        name: title,
        reason: REASONS[title],
        fame: 10 + Math.random() * 30,
        tick,
      })

      if (this.nicknames.length >= MAX_NICKNAMES) break
    }
  }

  private evolveFame(): void {
    for (const nn of this.nicknames) {
      // Fame grows slowly over time
      nn.fame = Math.min(100, nn.fame + Math.random() * 0.5)
    }
  }

  private cleanup(): void {
    if (this.nicknames.length > MAX_NICKNAMES) {
      this.nicknames.sort((a, b) => b.fame - a.fame)
      this.nicknames.length = MAX_NICKNAMES
    }
  }

  private hasNickname(entityId: number): boolean {
    return this.nicknames.some(n => n.entityId === entityId)
  }

  getNicknames(): Nickname[] { return this.nicknames }
  getNickname(entityId: number): Nickname | undefined {
    return this.nicknames.find(n => n.entityId === entityId)
  }
  getFamous(count: number): Nickname[] {
    return [...this.nicknames].sort((a, b) => b.fame - a.fame).slice(0, count)
  }
}
