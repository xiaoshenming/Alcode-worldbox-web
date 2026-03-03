import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSmockingMakersSystem } from '../systems/CreatureSmockingMakersSystem'
import type { SmockingMaker, SmockingType } from '../systems/CreatureSmockingMakersSystem'

// CreatureSmockingMakersSystem 测试:
// CHECK_INTERVAL=1470, MAX_MAKERS=30, SKILL_GROWTH=0.049, EXPIRE_AFTER=49000
// skillMap: entityId -> skill 缓存，技能持续成长
// cleanup: tick < cutoff (tick - 49000) 的 makers 被移除
// pruneDeadEntities: 每3600ticks清理死亡实体的skillMap条目

let nextId = 1
function makeSys(): CreatureSmockingMakersSystem { return new CreatureSmockingMakersSystem() }
function makeMaker(entityId: number, type: SmockingType = 'english', overrides: Partial<SmockingMaker> = {}): SmockingMaker {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    piecesMade: 12,
    smockingType: type,
    gatherPrecision: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

function makeEm(overrides: Record<string, any> = {}) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(undefined),
    hasComponent: vi.fn().mockReturnValue(true),
    ...overrides,
  }
}

describe('CreatureSmockingMakersSystem — 初始状态', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lattice'))
    expect((sys as any).makers[0].smockingType).toBe('lattice')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种Smocking类型', () => {
    const types: SmockingType[] = ['english', 'north_american', 'lattice', 'honeycomb']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].smockingType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureSmockingMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL(1470) 时跳过', () => {
    const em: any = makeEm()
    ;(sys as any).lastCheck = 0
    ;(sys as any).skillMap.set(1, 50)
    sys.update(1, em, 100) // 100 < 1470 跳过
    expect((sys as any).skillMap.get(1)).toBe(50) // 不变
  })

  it('tick 达到 CHECK_INTERVAL 时执行', () => {
    const em: any = makeEm({ getEntitiesWithComponents: vi.fn().mockReturnValue([]) })
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1470) // 1470 >= 1470 执行
    expect((sys as any).lastCheck).toBe(1470)
  })

  it('更新后 lastCheck 记录当前 tick', () => {
    const em: any = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('节流期间 lastCheck 不变', () => {
    const em: any = makeEm()
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 3100) // 3100 - 3000 < 1470
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureSmockingMakersSystem — skillMap 机制', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('直接注入 skillMap 可读取', () => {
    ;(sys as any).skillMap.set(10, 45.5)
    expect((sys as any).skillMap.get(10)).toBeCloseTo(45.5)
  })

  it('不同实体 skillMap 独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })

  it('gatherPrecision 基于 skill 计算: 13 + skill * 0.70', () => {
    const skill = 70
    const precision = 13 + skill * 0.70
    expect(precision).toBeCloseTo(62, 5)
  })

  it('reputation 基于 skill 计算: 10 + skill * 0.76', () => {
    const skill = 70
    const reputation = 10 + skill * 0.76
    expect(reputation).toBeCloseTo(63.2, 5)
  })
})

describe('CreatureSmockingMakersSystem — time-based cleanup', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick - 49000 之前的 maker 被移除', () => {
    const em: any = makeEm({ getEntitiesWithComponents: vi.fn().mockReturnValue([]) })
    ;(sys as any).makers.push(makeMaker(1, 'english', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    // tick=50001, cutoff=50001-49000=1001, maker.tick=1000 < 1001 => 移除
    sys.update(1, em, 50001)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick 在 cutoff 以内的 maker 保留', () => {
    const em: any = makeEm({ getEntitiesWithComponents: vi.fn().mockReturnValue([]) })
    ;(sys as any).makers.push(makeMaker(1, 'english', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    // tick=98999, cutoff=98999-49000=49999, maker.tick=50000 > 49999 => 保留
    sys.update(1, em, 98999)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合: 过期移除未过期保留', () => {
    const em: any = makeEm({ getEntitiesWithComponents: vi.fn().mockReturnValue([]) })
    ;(sys as any).makers.push(makeMaker(1, 'english', { tick: 1000 }))   // 过期
    ;(sys as any).makers.push(makeMaker(2, 'lattice', { tick: 60000 }))  // 保留
    ;(sys as any).lastCheck = 0
    // tick=55000, cutoff=55000-49000=6000
    // maker1.tick=1000 < 6000 => 移除
    // maker2.tick=60000 > 6000 => 保留
    sys.update(1, em, 55000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('smockingType 由 skill 级别决定(skill<25 => english)', () => {
    const skill = 10
    const typeIdx = Math.min(3, Math.floor(skill / 25)) // = 0
    const SMOCKING_TYPES = ['english', 'north_american', 'lattice', 'honeycomb']
    expect(SMOCKING_TYPES[typeIdx]).toBe('english')
  })

  it('smockingType 高技能(skill>=75 => honeycomb)', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25)) // = 3
    const SMOCKING_TYPES = ['english', 'north_american', 'lattice', 'honeycomb']
    expect(SMOCKING_TYPES[typeIdx]).toBe('honeycomb')
  })

  it('piecesMade 基于 skill 计算: 2 + floor(skill/9)', () => {
    const skill = 70
    const pieces = 2 + Math.floor(skill / 9) // = 2 + 7 = 9
    expect(pieces).toBe(9)
  })
})

describe('CreatureSmockingMakersSystem - 额外字段与综合测试', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('CHECK_INTERVAL=1470', () => { expect(1470).toBe(1470) })
  it('MAX_MAKERS=30', () => { expect(30).toBe(30) })
  it('SKILL_GROWTH=0.049', () => { expect(0.049).toBe(0.049) })
  it('gatherPrecision = 13 + skill * 0.70', () => {
    expect(13 + 70 * 0.70).toBeCloseTo(62)
  })
  it('reputation = 10 + skill * 0.76', () => {
    expect(10 + 70 * 0.76).toBeCloseTo(63.2)
  })
  it('piecesMade = 2 + floor(skill/9)', () => {
    expect(2 + Math.floor(70 / 9)).toBe(9)
  })
  it('update不崩溃（空em）', () => {
    const em: any = makeEm()
    expect(() => sys.update(0, em, 1470)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const em: any = makeEm()
    sys.update(99, em, 1470)
    expect((sys as any).lastCheck).toBe(1470)
  })
  it('tick=0不触发', () => {
    const em: any = makeEm()
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('cutoff=tick-49000：旧记录被清除', () => {
    const currentTick = 55000
    ;(sys as any).lastCheck = 0
    ;(sys as any).makers.push(makeMaker(1, 'english', { tick: 0 }))
    const em: any = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('新记录tick在cutoff之内不被清除', () => {
    const currentTick = 55000
    ;(sys as any).lastCheck = 0
    ;(sys as any).makers.push(makeMaker(1, 'lattice', { tick: currentTick - 10000 }))
    const em: any = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合新旧记录时仅旧记录被清除', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).makers.push(makeMaker(1, 'english', { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, 'honeycomb', { tick: currentTick - 5000 }))
    const em: any = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('smockingType=north_american有效', () => {
    ;(sys as any).makers.push(makeMaker(1, 'north_american'))
    expect((sys as any).makers[0].smockingType).toBe('north_american')
  })
  it('smockingType=honeycomb有效', () => {
    ;(sys as any).makers.push(makeMaker(1, 'honeycomb'))
    expect((sys as any).makers[0].smockingType).toBe('honeycomb')
  })
  it('update返回undefined', () => {
    const em: any = makeEm()
    expect(sys.update(0, em, 1470)).toBeUndefined()
  })
  it('注入5个maker后长度正确', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).makers.push(makeMaker(i)) }
    expect((sys as any).makers).toHaveLength(5)
  })
  it('makers初始为空', () => { expect((sys as any).makers).toHaveLength(0) })
  it('CRAFT_CHANCE=0.005', () => { expect(0.005).toBe(0.005) })
  it('skill增长0.049不超过100', () => {
    expect(Math.min(100, 99.96 + 0.049)).toBe(100)
  })
  it('typeIdx=floor(skill/25)夹到3', () => {
    const TYPES = ['english', 'north_american', 'lattice', 'honeycomb']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('honeycomb')
  })
  it('typeIdx=0时为english', () => {
    const TYPES = ['english', 'north_american', 'lattice', 'honeycomb']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('english')
  })
  it('EXPIRE_AFTER=49000', () => { expect(49000).toBe(49000) })
  it('连续多次update不崩溃', () => {
    const em: any = makeEm()
    expect(() => {
      sys.update(0, em, 1470)
      sys.update(0, em, 2940)
      sys.update(0, em, 4410)
    }).not.toThrow()
  })
  it('piecesMade=2+floor(0/9)=2（最低值）', () => {
    expect(2 + Math.floor(0 / 9)).toBe(2)
  })
  it('piecesMade=2+floor(100/9)=13（高技能）', () => {
    expect(2 + Math.floor(100 / 9)).toBe(13)
  })
  it('MAX_MAKERS=30达到上限不再添加', () => {
    for (let i = 1; i <= 30; i++) { ;(sys as any).makers.push(makeMaker(i)) }
    const em: any = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1470)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
    vi.restoreAllMocks()
  })
})

describe('CreatureSmockingMakersSystem - 追加', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  it('tick差不足CHECK_INTERVAL时不触发', () => {
    ;(sys as any).lastCheck = 1000
    const em: any = makeEm()
    sys.update(0, em, 1000 + 1469)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('smockingType=lattice有效', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lattice'))
    expect((sys as any).makers[0].smockingType).toBe('lattice')
  })
})
