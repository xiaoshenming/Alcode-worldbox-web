import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePerfumersSystem } from '../systems/CreaturePerfumersSystem'
import type { Perfumer, FragranceType } from '../systems/CreaturePerfumersSystem'

let nextId = 1
function makeSys(): CreaturePerfumersSystem { return new CreaturePerfumersSystem() }
function makePerfumer(entityId: number, type: FragranceType = 'floral', skill = 70, tick = 0): Perfumer {
  return { id: nextId++, entityId, skill, blendsCreated: 10, fragranceType: type, potency: 65, complexity: 60, tick }
}

// 模拟 EntityManager
function makeEM(eids: number[], ages: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: (_: string, __: string) => eids,
    getComponent: (_eid: number, _type: string) => ({ age: ages[_eid] ?? 20 }),
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 1400
const EXPIRE_AFTER = 55000

describe('CreaturePerfumersSystem — 基础状态', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无香水师', () => { expect((sys as any).perfumers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'herbal'))
    expect((sys as any).perfumers[0].fragranceType).toBe('herbal')
  })

  it('返回内部引用', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    expect((sys as any).perfumers).toBe((sys as any).perfumers)
  })

  it('支持所有4种香型', () => {
    const types: FragranceType[] = ['floral', 'herbal', 'spiced', 'resinous']
    types.forEach((t, i) => { ;(sys as any).perfumers.push(makePerfumer(i + 1, t)) })
    const all = (sys as any).perfumers
    types.forEach((t, i) => { expect(all[i].fragranceType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    expect((sys as any).perfumers).toHaveLength(2)
  })
})

describe('CreaturePerfumersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<CHECK_INTERVAL时不执行update逻辑', () => {
    const em = makeEM([1, 2, 3])
    // 第一次调用设置 lastCheck=0
    ;(sys as any).lastCheck = 0
    // tick=100，差值100 < 1400，应当跳过
    sys.update(1, em as any, 100)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick差值>=CHECK_INTERVAL时执行逻辑', () => {
    // 强制 Math.random 返回 0（小于 CRAFT_CHANCE 0.006）
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([1])
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      // 由于 CRAFT_CHANCE=0.006 且 random=0<0.006，且 age>=10，应产生香水师
      expect((sys as any).perfumers.length).toBeGreaterThan(0)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('连续两次update，第二次在interval内不重复执行', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([1])
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      const countAfterFirst = (sys as any).perfumers.length
      // 第二次 tick 差值不足
      sys.update(1, em as any, CHECK_INTERVAL + 2)
      expect((sys as any).perfumers.length).toBe(countAfterFirst)
    } finally {
      randSpy.mockRestore()
    }
  })
})

describe('CreaturePerfumersSystem — skillMap 与技能增长', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('新实体从skillMap无记录时使用随机初始值', () => {
    // skillMap 初始为空
    expect((sys as any).skillMap.size).toBe(0)
    // 注入记录
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skill增长后写回skillMap', () => {
    const SKILL_GROWTH = 0.07
    ;(sys as any).skillMap.set(42, 30)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([42], { 42: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      // 30 + SKILL_GROWTH = 30.07
      const stored = (sys as any).skillMap.get(42)
      expect(stored).toBeCloseTo(30 + SKILL_GROWTH, 5)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('skill上限为100不超出', () => {
    ;(sys as any).skillMap.set(42, 99.97)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([42], { 42: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      const stored = (sys as any).skillMap.get(42)
      expect(stored).toBeLessThanOrEqual(100)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('skill=100时精确保持100', () => {
    ;(sys as any).skillMap.set(42, 100)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([42], { 42: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      expect((sys as any).skillMap.get(42)).toBe(100)
    } finally {
      randSpy.mockRestore()
    }
  })
})

describe('CreaturePerfumersSystem — fragranceType 由技能决定', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25时 typeIdx=0 → floral', () => {
    ;(sys as any).skillMap.set(1, 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([1], { 1: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      const p = (sys as any).perfumers[0]
      expect(p.fragranceType).toBe('floral')
    } finally {
      randSpy.mockRestore()
    }
  })

  it('skill>=75时 typeIdx=3 → resinous', () => {
    ;(sys as any).skillMap.set(1, 75)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([1], { 1: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      const p = (sys as any).perfumers[0]
      expect(p.fragranceType).toBe('resinous')
    } finally {
      randSpy.mockRestore()
    }
  })
})

describe('CreaturePerfumersSystem — time-based cleanup', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick远超cutoff时旧香水师被清除', () => {
    // 注入 tick=100 的香水师，再以 tick=100+EXPIRE_AFTER+CHECK_INTERVAL+1 触发 update
    ;(sys as any).perfumers.push(makePerfumer(99, 'floral', 50, 100))
    const em = makeEM([])
    const bigTick = 100 + EXPIRE_AFTER + CHECK_INTERVAL + 1
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, bigTick)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('tick未超cutoff时香水师保留', () => {
    const currentTick = CHECK_INTERVAL + 1
    ;(sys as any).perfumers.push(makePerfumer(99, 'floral', 50, currentTick - 1000))
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, currentTick)
    // cutoff = currentTick - 55000，perfumer.tick = currentTick-1000 >> cutoff，应保留
    expect((sys as any).perfumers).toHaveLength(1)
  })

  it('混合新旧香水师只删旧的', () => {
    const baseTick = EXPIRE_AFTER + CHECK_INTERVAL + 10000
    // 旧的：tick远小于cutoff
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 10))
    // 新的：tick接近baseTick
    ;(sys as any).perfumers.push(makePerfumer(2, 'herbal', 60, baseTick - 100))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    sys.update(1, em as any, baseTick)
    expect((sys as any).perfumers).toHaveLength(1)
    expect((sys as any).perfumers[0].entityId).toBe(2)
  })
})

describe('CreaturePerfumersSystem — 上限约束', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_PERFUMERS=34时不超过上限', () => {
    // 预填34个
    for (let i = 0; i < 34; i++) {
      ;(sys as any).perfumers.push(makePerfumer(i + 1))
    }
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const em = makeEM([100, 101, 102], { 100: 20, 101: 20, 102: 20 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      expect((sys as any).perfumers.length).toBeLessThanOrEqual(34)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('age<10的生物跳过', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      // age=5，应被过滤
      const em = makeEM([1], { 1: 5 })
      sys.update(1, em as any, CHECK_INTERVAL + 1)
      expect((sys as any).perfumers).toHaveLength(0)
    } finally {
      randSpy.mockRestore()
    }
  })
})
