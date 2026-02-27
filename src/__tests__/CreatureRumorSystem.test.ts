import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRumorSystem } from '../systems/CreatureRumorSystem'
import type { Rumor, RumorTopic } from '../systems/CreatureRumorSystem'

let nextId = 1
function makeSys(): CreatureRumorSystem { return new CreatureRumorSystem() }
function makeRumor(originId: number, topic: RumorTopic = 'danger'): Rumor {
  return { id: nextId++, topic, originId, spreadCount: 3, distortion: 20, believability: 70, tick: 0 }
}

describe('CreatureRumorSystem.getRumors', () => {
  let sys: CreatureRumorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无谣言', () => { expect(sys.getRumors()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rumors.push(makeRumor(1, 'treasure'))
    expect(sys.getRumors()[0].topic).toBe('treasure')
  })
  it('返回内部引用', () => {
    ;(sys as any).rumors.push(makeRumor(1))
    expect(sys.getRumors()).toBe((sys as any).rumors)
  })
  it('支持所有6种谣言话题', () => {
    const topics: RumorTopic[] = ['danger', 'treasure', 'betrayal', 'hero', 'monster', 'miracle']
    topics.forEach((t, i) => { ;(sys as any).rumors.push(makeRumor(i + 1, t)) })
    expect(sys.getRumors()).toHaveLength(6)
  })
})
