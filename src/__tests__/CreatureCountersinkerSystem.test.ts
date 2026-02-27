import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCountersinkerSystem } from '../systems/CreatureCountersinkerSystem'
import type { Countersinker } from '../systems/CreatureCountersinkerSystem'

let nextId = 1
function makeSys(): CreatureCountersinkerSystem { return new CreatureCountersinkerSystem() }
function makeCountersinker(entityId: number): Countersinker {
  return { id: nextId++, entityId, countersinkingSkill: 30, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
}

describe('CreatureCountersinkerSystem.getCountersinkers', () => {
  let sys: CreatureCountersinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无沉孔工', () => { expect(sys.getCountersinkers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).countersinkers.push(makeCountersinker(1))
    expect(sys.getCountersinkers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).countersinkers.push(makeCountersinker(1))
    expect(sys.getCountersinkers()).toBe((sys as any).countersinkers)
  })

  it('多个全部返回', () => {
    ;(sys as any).countersinkers.push(makeCountersinker(1))
    ;(sys as any).countersinkers.push(makeCountersinker(2))
    expect(sys.getCountersinkers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeCountersinker(10)
    c.countersinkingSkill = 80; c.angleControl = 75; c.depthPrecision = 70; c.flushAlignment = 65
    ;(sys as any).countersinkers.push(c)
    const r = sys.getCountersinkers()[0]
    expect(r.countersinkingSkill).toBe(80); expect(r.angleControl).toBe(75)
    expect(r.depthPrecision).toBe(70); expect(r.flushAlignment).toBe(65)
  })
})
