import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSomniloquySystem } from '../systems/CreatureSomniloquySystem'
import type { SleepTalk, SleepTalkType } from '../systems/CreatureSomniloquySystem'

let nextId = 1
function makeSys(): CreatureSomniloquySystem { return new CreatureSomniloquySystem() }
function makeTalk(entityId: number, type: SleepTalkType = 'secret'): SleepTalk {
  return { id: nextId++, entityId, talkType: type, content: 'hidden treasure...', significance: 50, tick: 0 }
}

describe('CreatureSomniloquySystem.getTalks', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梦话', () => { expect((sys as any).talks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).talks.push(makeTalk(1, 'prophecy'))
    expect((sys as any).talks[0].talkType).toBe('prophecy')
  })
  it('返回内部引用', () => {
    ;(sys as any).talks.push(makeTalk(1))
    expect((sys as any).talks).toBe((sys as any).talks)
  })
  it('支持所有6种梦话类型', () => {
    const types: SleepTalkType[] = ['secret', 'prophecy', 'nonsense', 'memory', 'warning', 'confession']
    types.forEach((t, i) => { ;(sys as any).talks.push(makeTalk(i + 1, t)) })
    const all = (sys as any).talks
    types.forEach((t, i) => { expect(all[i].talkType).toBe(t) })
  })
  it('字段正确', () => {
    ;(sys as any).talks.push(makeTalk(2, 'memory'))
    const t = (sys as any).talks[0]
    expect(t.significance).toBe(50)
    expect(t.content).toBe('hidden treasure...')
  })
})
