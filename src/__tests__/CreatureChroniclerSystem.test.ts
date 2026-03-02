import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureChroniclerSystem } from '../systems/CreatureChroniclerSystem'
import type { ChroniclerData, ChroniclerSpecialty } from '../systems/CreatureChroniclerSystem'

function makeSys(): CreatureChroniclerSystem { return new CreatureChroniclerSystem() }
function makeChronicler(
  entityId: number,
  specialty: ChroniclerSpecialty = 'war',
  overrides: Partial<ChroniclerData> = {}
): ChroniclerData {
  return { entityId, recordCount: 5, specialty, reputation: 50, active: true, tick: 0, ...overrides }
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
// 基础状态
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem 基础状态', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始chroniclers数组为空', () => {
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('_chroniclersSet初始为空Set', () => {
    expect((sys as any)._chroniclersSet.size).toBe(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('chroniclers字段是Array类型', () => {
    expect(Array.isArray((sys as any).chroniclers)).toBe(true)
  })

  it('_chroniclersSet字段是Set类型', () => {
    expect((sys as any)._chroniclersSet).toBeInstanceOf(Set)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ChroniclerData 结构
// ─────────────────────────────────────────────────────────────────────────────
describe('ChroniclerData 结构验证', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('注入后可查询specialty字段', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'culture'))
    expect((sys as any).chroniclers[0].specialty).toBe('culture')
  })

  it('四种specialty均可注入', () => {
    const specialties: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
    specialties.forEach((s, i) => { ;(sys as any).chroniclers.push(makeChronicler(i + 1, s)) })
    const all = (sys as any).chroniclers as ChroniclerData[]
    expect(all.map(c => c.specialty)).toEqual(['war', 'nature', 'culture', 'trade'])
  })

  it('四种specialty注入后chroniclers长度为4', () => {
    const specialties: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
    specialties.forEach((s, i) => { ;(sys as any).chroniclers.push(makeChronicler(i + 10, s)) })
    expect((sys as any).chroniclers).toHaveLength(4)
  })

  it('active字段可设为false', () => {
    ;(sys as any).chroniclers.push({ ...makeChronicler(1), active: false })
    expect((sys as any).chroniclers[0].active).toBe(false)
  })

  it('active字段默认为true', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1))
    expect((sys as any).chroniclers[0].active).toBe(true)
  })

  it('recordCount字段可正确读取', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 42 }))
    expect((sys as any).chroniclers[0].recordCount).toBe(42)
  })

  it('reputation字段可设置为0', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 0 }))
    expect((sys as any).chroniclers[0].reputation).toBe(0)
  })

  it('reputation字段可设置为100', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 100 }))
    expect((sys as any).chroniclers[0].reputation).toBe(100)
  })

  it('tick字段可独立设置', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { tick: 9999 }))
    expect((sys as any).chroniclers[0].tick).toBe(9999)
  })

  it('entityId字段可正确读取', () => {
    ;(sys as any).chroniclers.push(makeChronicler(42, 'trade'))
    expect((sys as any).chroniclers[0].entityId).toBe(42)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// tick 间隔控制（CHECK_INTERVAL = 3000）
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem tick间隔控制', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('tick差值<3000时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=3000时更新lastCheck', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('lastCheck=0, tick=2999时不触发', () => {
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=0, tick=3000时触发', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('lastCheck=3000, tick=5999时不触发', () => {
    ;(sys as any).lastCheck = 3000
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 5999)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('lastCheck=3000, tick=6000时触发', () => {
    ;(sys as any).lastCheck = 3000
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('连续update触发多次时lastCheck递增', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    sys.update(16, em, 6000)
    sys.update(16, em, 9000)
    expect((sys as any).lastCheck).toBe(9000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// reputation 上限控制
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem reputation上限', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('reputation上限为100，多次update后不超过100', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 100 }))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    for (let t = 3000; t <= 30000; t += 3000) {
      sys.update(16, em, t)
    }
    expect((sys as any).chroniclers[0].reputation).toBeLessThanOrEqual(100)
  })

  it('reputation从0开始不会变成负数', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 0, recordCount: 0 }))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    for (let t = 3000; t <= 30000; t += 3000) {
      sys.update(16, em, t)
    }
    expect((sys as any).chroniclers[0].reputation).toBeGreaterThanOrEqual(0)
  })

  it('recordCount超过50时reputation可能额外增加', () => {
    // 注入高recordCount强制触发额外增益路径（通过mock random）
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 50, recordCount: 51 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.005) // < 0.01 触发额外增益
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    // reputation应该增加了(被random控制)
    expect((sys as any).chroniclers[0].reputation).toBeGreaterThanOrEqual(50)
  })

  it('reputation增加时受Math.min(100)约束', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'nature', { reputation: 99.9 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 触发recordCount++和reputation+0.2
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].reputation).toBeLessThanOrEqual(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cleanup 逻辑（hasComponent返回false时删除）
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem cleanup逻辑', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('hasComponent返回false时删除chronicler', () => {
    ;(sys as any).chroniclers.push(makeChronicler(99, 'trade'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('hasComponent返回true时保留chronicler', () => {
    ;(sys as any).chroniclers.push(makeChronicler(99, 'nature'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(1)
  })

  it('部分chronicler死亡时只删除死亡的', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war'))   // alive
    ;(sys as any).chroniclers.push(makeChronicler(2, 'trade')) // dead
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (id: number, _comp: string) => id === 1,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(1)
    expect((sys as any).chroniclers[0].entityId).toBe(1)
  })

  it('所有chronicler死亡时数组清空', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war'))
    ;(sys as any).chroniclers.push(makeChronicler(2, 'nature'))
    ;(sys as any).chroniclers.push(makeChronicler(3, 'culture'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('cleanup时_chroniclersSet中实体被删除', () => {
    ;(sys as any).chroniclers.push(makeChronicler(99, 'trade'))
    ;(sys as any)._chroniclersSet.add(99)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(16, em, 3000)
    // _chroniclersSet在遍历时delete了entityId（即便chronicle被splice）
    // 由于源码在cleanup循环里先delete再判断，Set应该不包含99
    expect((sys as any)._chroniclersSet.has(99)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 新chronicler注入逻辑（通过mock Random）
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem 新chronicler注入', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('chroniclers已满(10)时不再新增', () => {
    // 注入10个chronicler
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).chroniclers.push(makeChronicler(i, 'war'))
      ;(sys as any)._chroniclersSet.add(i)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < ASSIGN_CHANCE=0.002
    const em = {
      getEntitiesWithComponent: (comp: string) => comp === 'creature' ? [99] : [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    // chroniclers仍为10，未增加
    expect((sys as any).chroniclers).toHaveLength(10)
  })

  it('random > ASSIGN_CHANCE时不新增chronicler', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // > 0.002
    const em = {
      getEntitiesWithComponent: (comp: string) => comp === 'creature' ? [1] : [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('已在_chroniclersSet中的实体不会重复注入', () => {
    ;(sys as any)._chroniclersSet.add(1)
    // pickRandom会固定选到1，但因为已在set中所以不添加
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {
      getEntitiesWithComponent: (comp: string) => comp === 'creature' ? [1] : [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    // entityId=1已在set中，不新增
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('无生物实体时不新增chronicler', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {
      getEntitiesWithComponent: () => [], // 无生物
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// recordCount 增长逻辑
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem recordCount增长', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('random < RECORD_RATE[war](0.03)时recordCount增加', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.03
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
  })

  it('random >= RECORD_RATE[war]时recordCount不增加', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.03
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(5)
  })

  it('nature specialty的RECORD_RATE为0.04', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'nature', { recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.035) // < 0.04 但 > 0.03
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
  })

  it('culture specialty的RECORD_RATE为0.025', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'culture', { recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.02) // < 0.025
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
  })

  it('trade specialty的RECORD_RATE为0.035', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'trade', { recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.03) // < 0.035
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
  })

  it('recordCount增加时reputation也增加+0.2', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 0, reputation: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.03 触发
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].reputation).toBeCloseTo(50.2)
  })

  it('多个chronicler各自独立增加recordCount', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 0 }))
    ;(sys as any).chroniclers.push(makeChronicler(2, 'trade', { recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 两者的rate
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
    expect((sys as any).chroniclers[1].recordCount).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MAX_CHRONICLERS = 10 边界
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem MAX_CHRONICLERS边界', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('chroniclers.length < 10时可以新增（条件满足时）', () => {
    // 注入9个
    for (let i = 1; i <= 9; i++) {
      ;(sys as any).chroniclers.push(makeChronicler(i, 'war'))
      ;(sys as any)._chroniclersSet.add(i)
    }
    expect((sys as any).chroniclers.length).toBeLessThan(10)
  })

  it('chroniclers.length == 10时不可新增', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).chroniclers.push(makeChronicler(i, 'war'))
      ;(sys as any)._chroniclersSet.add(i)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {
      getEntitiesWithComponent: (comp: string) => comp === 'creature' ? [99] : [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 补充：多轮update的综合行为
// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureChroniclerSystem 多轮update综合行为', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('tick未到CHECK_INTERVAL时chroniclers不变', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 5 }))
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 100)
    sys.update(16, em, 200)
    expect((sys as any).chroniclers[0].recordCount).toBe(5)
  })

  it('混合active/inactive chronicler: inactive保留到cleanup才被删', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { active: false }))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true, // entity存在
    } as any
    sys.update(16, em, 3000)
    // active=false不影响存活（cleanup只检查hasComponent，不检查active）
    expect((sys as any).chroniclers).toHaveLength(1)
  })

  it('两个不同specialty的chronicler在同一update中各自计算', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 0, reputation: 0 }))
    ;(sys as any).chroniclers.push(makeChronicler(2, 'nature', { recordCount: 0, reputation: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 两者rate均触发
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers[0].recordCount).toBe(1)
    expect((sys as any).chroniclers[1].recordCount).toBe(1)
  })

  it('lastCheck在触发后正确更新为当前tick', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('chronicle被删除后再次update不报错', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(16, em, 3000)
    // chronicler已删除
    expect(() => sys.update(16, em, 6000)).not.toThrow()
  })

  it('chroniclers从1增到多个时，每个entityId都不同', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war'))
    ;(sys as any).chroniclers.push(makeChronicler(2, 'nature'))
    ;(sys as any).chroniclers.push(makeChronicler(3, 'trade'))
    const ids = (sys as any).chroniclers.map((c: ChroniclerData) => c.entityId)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('lastCheck初始为0, 小于CHECK_INTERVAL不更新', () => {
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('reputation不会超过100（多次触发recordCount+reputation+0.2）', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'nature', { reputation: 99.9, recordCount: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    for (let t = 3000; t <= 60000; t += 3000) {
      sys.update(16, em, t)
    }
    expect((sys as any).chroniclers[0].reputation).toBeLessThanOrEqual(100)
  })
})
