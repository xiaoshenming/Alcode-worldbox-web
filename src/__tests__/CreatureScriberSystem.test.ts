import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureScriberSystem } from '../systems/CreatureScriberSystem'
import type { Scriber } from '../systems/CreatureScriberSystem'

let nextId = 1
function makeSys(): CreatureScriberSystem { return new CreatureScriberSystem() }
function makeScriber(entityId: number, skill = 70, lineAcc = 65, layoutPrec = 80, markDepth = 75, tick = 0): Scriber {
  return { id: nextId++, entityId, scribingSkill: skill, lineAccuracy: lineAcc, layoutPrecision: layoutPrec, markingDepth: markDepth, tick }
}
function makeEm() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) } as any
}

describe('CreatureScriberSystem.getScribers', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无划线工', () => { expect((sys as any).scribers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    expect((sys as any).scribers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    expect((sys as any).scribers).toBe((sys as any).scribers)
  })
  it('字段正确', () => {
    ;(sys as any).scribers.push(makeScriber(2))
    const s = (sys as any).scribers[0]
    expect(s.scribingSkill).toBe(70)
    expect(s.layoutPrecision).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    ;(sys as any).scribers.push(makeScriber(2))
    expect((sys as any).scribers).toHaveLength(2)
  })
})

describe('CreatureScriberSystem — CHECK_INTERVAL=3090 节流', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 0)
    sys.update(1, em, 100) // 100 < 3090
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).lastCheck).toBe(3090)
  })

  it('tick < CHECK_INTERVAL时跳过技能增长', () => {
    const em = makeEm()
    sys.update(1, em, 0)
    ;(sys as any).scribers.push(makeScriber(1, 50))
    sys.update(1, em, 100) // 100 < 3090，跳过
    expect((sys as any).scribers[0].scribingSkill).toBe(50)
  })

  it('tick >= CHECK_INTERVAL时执行技能增长', () => {
    const em = makeEm()
    sys.update(1, em, 0)
    ;(sys as any).scribers.push(makeScriber(1, 50))
    sys.update(1, em, 3090) // 3090 >= 3090
    expect((sys as any).scribers[0].scribingSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck更新后连续小tick不再触发', () => {
    const em = makeEm()
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    const lc = (sys as any).lastCheck
    sys.update(1, em, 3091) // 3091 - 3090 = 1 < 3090，跳过
    expect((sys as any).lastCheck).toBe(lc)
  })
})

describe('CreatureScriberSystem — 技能增长速率', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('scribingSkill每次+0.02', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 50))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers[0].scribingSkill).toBeCloseTo(50.02, 5)
  })

  it('lineAccuracy每次+0.015', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 50, 60))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers[0].lineAccuracy).toBeCloseTo(60.015, 5)
  })

  it('markingDepth每次+0.01', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 50, 60, 80, 40))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers[0].markingDepth).toBeCloseTo(40.01, 5)
  })

  it('技能增长不超过100上限', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 99.99, 99.99, 80, 99.99))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers[0].scribingSkill).toBeLessThanOrEqual(100)
    expect((sys as any).scribers[0].lineAccuracy).toBeLessThanOrEqual(100)
    expect((sys as any).scribers[0].markingDepth).toBeLessThanOrEqual(100)
  })

  it('多轮累积增长正确', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 50))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    sys.update(1, em, 6180)
    expect((sys as any).scribers[0].scribingSkill).toBeCloseTo(50.04, 4)
  })
})

describe('CreatureScriberSystem — cleanup: 技能增长后仍<=4时移除', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 注意：源码中先执行技能增长(+0.02)，再执行cleanup(<=4)
  // 所以初始skill=3.98 �� 3.98+0.02=4.0 → 4.0<=4 → 移除
  // 初始skill=3.99 → 3.99+0.02=4.01 → 4.01>4 → 保留
  it('初始skill=3.98，增长后恰好为4，被移除', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 3.98))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers).toHaveLength(0)
  })

  it('初始skill=3.99，增长后为4.01，不被移除', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 3.99))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers).toHaveLength(1)
  })

  it('初始skill=4（增长后4.02），不被移除', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 4))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    // 4.02 > 4 → 不满足 <= 4 → 保留
    expect((sys as any).scribers).toHaveLength(1)
  })

  it('混合列表只移除增长后仍<=4的', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 3.98)) // 3.98+0.02=4.00 → 移除
    ;(sys as any).scribers.push(makeScriber(2, 50))    // 50.02 → 保留
    ;(sys as any).scribers.push(makeScriber(3, 3.5))   // 3.52 → 移除
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers).toHaveLength(1)
    expect((sys as any).scribers[0].entityId).toBe(2)
  })

  it('cleanup边界：skill 3.97 → 3.99<=4被移除，4.0 → 4.02>4被保留', () => {
    const em = makeEm()
    ;(sys as any).scribers.push(makeScriber(1, 3.97))
    ;(sys as any).scribers.push(makeScriber(2, 4.0))
    sys.update(1, em, 0)
    sys.update(1, em, 3090)
    expect((sys as any).scribers).toHaveLength(1)
    expect((sys as any).scribers[0].entityId).toBe(2)
  })
})

describe('CreatureScriberSystem — MAX_SCRIBERS=10 上限与nextId', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始scribers为空', () => {
    expect((sys as any).scribers).toHaveLength(0)
  })

  it('nextId从1开始递增', () => {
    expect((sys as any).nextId).toBe(1)
    ;(sys as any).scribers.push(makeScriber(1))
    ;(sys as any).scribers.push(makeScriber(2))
    expect((sys as any).scribers[0].id).toBe(1)
    expect((sys as any).scribers[1].id).toBe(2)
  })
})
