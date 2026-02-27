import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChainmakerSystem } from '../systems/CreatureChainmakerSystem'
import type { Chainmaker } from '../systems/CreatureChainmakerSystem'

let nextId = 1
function makeSys(): CreatureChainmakerSystem { return new CreatureChainmakerSystem() }
function makeChainmaker(entityId: number): Chainmaker {
  return { id: nextId++, entityId, linkForging: 30, weldingSkill: 25, tensileTest: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureChainmakerSystem.getChainmakers', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无链匠', () => { expect(sys.getChainmakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    expect(sys.getChainmakers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    expect(sys.getChainmakers()).toBe((sys as any).chainmakers)
  })

  it('多个全部返回', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    ;(sys as any).chainmakers.push(makeChainmaker(2))
    expect(sys.getChainmakers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeChainmaker(10)
    c.linkForging = 80; c.weldingSkill = 75; c.tensileTest = 70; c.outputQuality = 65
    ;(sys as any).chainmakers.push(c)
    const r = sys.getChainmakers()[0]
    expect(r.linkForging).toBe(80); expect(r.weldingSkill).toBe(75)
    expect(r.tensileTest).toBe(70); expect(r.outputQuality).toBe(65)
  })
})
