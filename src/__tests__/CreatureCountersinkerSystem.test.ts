import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCountersinkerSystem } from '../systems/CreatureCountersinkerSystem'
import type { Countersinker } from '../systems/CreatureCountersinkerSystem'

let nextId = 1
function makeSys(): CreatureCountersinkerSystem { return new CreatureCountersinkerSystem() }
function makeCountersinker(entityId: number, countersinkingSkill = 30): Countersinker {
  return { id: nextId++, entityId, countersinkingSkill, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
}

const EM_EMPTY = {} as any

describe('CreatureCountersinkerSystem', () => {
  let sys: CreatureCountersinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无沉孔工', () => {
    expect((sys as any).countersinkers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).countersinkers.push(makeCountersinker(1))
    expect((sys as any).countersinkers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).countersinkers.push(makeCountersinker(1))
    ;(sys as any).countersinkers.push(makeCountersinker(2))
    ;(sys as any).countersinkers.push(makeCountersinker(3))
    expect((sys as any).countersinkers).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const c = makeCountersinker(10)
    c.countersinkingSkill = 80; c.angleControl = 75; c.depthPrecision = 70; c.flushAlignment = 65
    ;(sys as any).countersinkers.push(c)
    const r = (sys as any).countersinkers[0]
    expect(r.countersinkingSkill).toBe(80)
    expect(r.angleControl).toBe(75)
    expect(r.depthPrecision).toBe(70)
    expect(r.flushAlignment).toBe(65)
  })

  // 5. tick差值<2990时不更新lastCheck
  it('tick差值<2990时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, EM_EMPTY, 1000 + 2989)
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=2990时更新lastCheck
  it('tick差值>=2990时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const tick = 1000 + 2990
    sys.update(1, EM_EMPTY, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })

  // 7. update后countersinkingSkill+0.02
  it('update后countersinkingSkill+0.02', () => {
    const c = makeCountersinker(1, 30)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.02)
  })

  // 8. update后angleControl+0.015
  it('update后angleControl+0.015', () => {
    const c = makeCountersinker(1, 30)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    expect((sys as any).countersinkers[0].angleControl).toBeCloseTo(25.015)
  })

  // 9. countersinkingSkill上限100
  it('countersinkingSkill上限100', () => {
    const c = makeCountersinker(1, 99.99)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    expect((sys as any).countersinkers[0].countersinkingSkill).toBe(100)
  })

  // 10. cleanup: countersinkingSkill=3.98先+0.02变4.00则删除，entityId=2保留
  it('cleanup: countersinkingSkill=3.98先增至4.00则删除，entityId=2保留', () => {
    const c1: Countersinker = { id: nextId++, entityId: 1, countersinkingSkill: 3.98, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
    const c2: Countersinker = { id: nextId++, entityId: 2, countersinkingSkill: 30, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
    ;(sys as any).countersinkers.push(c1, c2)
    sys.update(1, EM_EMPTY, 2990)
    const list = (sys as any).countersinkers as Countersinker[]
    // c1: 3.98+0.02=4.00, <=4 → 删除
    expect(list.find((c: Countersinker) => c.entityId === 1)).toBeUndefined()
    // c2: 30+0.02=30.02, >4 → 保留
    expect(list.find((c: Countersinker) => c.entityId === 2)).toBeDefined()
  })

  // 11. flushAlignment也递增+0.01
  it('update后flushAlignment+0.01', () => {
    const c = makeCountersinker(1, 30)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    expect((sys as any).countersinkers[0].flushAlignment).toBeCloseTo(35.01)
  })

  // 12. depthPrecision不被update改变
  it('depthPrecision不被update改变', () => {
    const c = makeCountersinker(1, 30)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    expect((sys as any).countersinkers[0].depthPrecision).toBe(20)
  })

  // 13. 多次update后技能累积增长
  it('多次update后countersinkingSkill累积增长', () => {
    const c = makeCountersinker(1, 30)
    ;(sys as any).countersinkers.push(c)
    sys.update(1, EM_EMPTY, 2990)
    ;(sys as any).lastCheck = 0
    sys.update(1, EM_EMPTY, 5980)
    expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.04)
  })
})
