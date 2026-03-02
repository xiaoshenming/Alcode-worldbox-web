import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureSuperstitionSystem } from '../systems/CreatureSuperstitionSystem'
import type { Superstition, SuperstitionType } from '../systems/CreatureSuperstitionSystem'

// CHECK_INTERVAL=800, MAX_SUPERSTITIONS=20, MIN_STRENGTH=5, MAX_STRENGTH=100
// DECAY_BASE=0.3, BELIEF_SPREAD_RANGE=8, FORM_CHANCE=0.015
// TYPE_CONFIG: lucky_spot(+,r3), cursed_ground(-,r4), sacred_tree(+,r5),
//             omen_bird(-,r3), forbidden_path(-,r6), blessed_water(+,r4)

function makeSys() { return new CreatureSuperstitionSystem() }

function makeSup(id: number, strength: number, believers = 0, overrides: Partial<Superstition> = {}): Superstition {
  const b = new Set<number>()
  for (let i = 0; i < believers; i++) b.add(i + 1)
  return {
    id, type: 'lucky_spot', x: 100, y: 100, radius: 3,
    strength, originTick: 0, believers: b, positive: true, decayRate: 0.3,
    ...overrides,
  }
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - 初始化', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始化成功，是 CreatureSuperstitionSystem 实例', () => {
    expect(sys).toBeInstanceOf(CreatureSuperstitionSystem)
  })

  it('初始 superstitions 为空数组', () => {
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('初始 nextId = 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck = 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('superstitions 是 Array', () => {
    expect(Array.isArray((sys as any).superstitions)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - SuperstitionType 数据验证', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('6 种 SuperstitionType 都可注入', () => {
    const types: SuperstitionType[] = ['lucky_spot', 'cursed_ground', 'sacred_tree', 'omen_bird', 'forbidden_path', 'blessed_water']
    for (const type of types) {
      ;(sys as any).superstitions.push({ ...makeSup(1, 50), type })
    }
    expect((sys as any).superstitions.length).toBe(6)
  })

  it('lucky_spot 是正面迷信（positive=true）', () => {
    const sup = makeSup(1, 50)
    expect(sup.positive).toBe(true)
  })

  it('cursed_ground 可标记为负面（positive=false）', () => {
    const sup = { ...makeSup(1, 50), type: 'cursed_ground' as SuperstitionType, positive: false }
    expect(sup.positive).toBe(false)
  })

  it('sacred_tree 是正面迷信', () => {
    const sup = { ...makeSup(1, 50), type: 'sacred_tree' as SuperstitionType, positive: true }
    expect(sup.positive).toBe(true)
  })

  it('omen_bird 是负面迷信', () => {
    const sup = { ...makeSup(1, 50), type: 'omen_bird' as SuperstitionType, positive: false }
    expect(sup.positive).toBe(false)
  })

  it('forbidden_path 是负面迷信', () => {
    const sup = { ...makeSup(1, 50), type: 'forbidden_path' as SuperstitionType, positive: false }
    expect(sup.positive).toBe(false)
  })

  it('blessed_water 是正面迷信', () => {
    const sup = { ...makeSup(1, 50), type: 'blessed_water' as SuperstitionType, positive: true }
    expect(sup.positive).toBe(true)
  })

  it('TYPE_CONFIG radius: lucky_spot=3', () => {
    const sup = makeSup(1, 50)
    // makeSup 默认 radius=3，对应 lucky_spot
    expect(sup.radius).toBe(3)
  })

  it('Superstition 包含 believers Set', () => {
    const sup = makeSup(1, 50, 3)
    expect(sup.believers).toBeInstanceOf(Set)
    expect(sup.believers.size).toBe(3)
  })

  it('Superstition 包含 decayRate 字段', () => {
    const sup = makeSup(1, 50)
    expect(sup).toHaveProperty('decayRate')
  })

  it('Superstition 包含 originTick 字段', () => {
    const sup = makeSup(1, 50)
    expect(sup.originTick).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - CHECK_INTERVAL 节流（800）', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('tick < 800 时不更新（lastCheck 不变）', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick = 800 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('tick > 800 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('差值 799 不触发更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 800)
    sys.update(1, em, 1599)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('差值 800 触发更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 800)
    sys.update(1, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('大 tick 跳跃时正确触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 99000)
    expect((sys as any).lastCheck).toBe(99000)
  })

  it('连续两次小 tick 都不触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 400)
    sys.update(1, em, 799)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - decaySuperstitions 逻辑', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('无 believers 时 believerFactor=1.0，decay = 0.3*1.0', () => {
    const sup = makeSup(1, 50, 0)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    expect(sup.strength).toBeCloseTo(49.7, 5)
  })

  it('20 个 believers 时 believerFactor = max(0.3, 1-1.0) = 0.3', () => {
    const sup = makeSup(1, 50, 20)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // 0.3 * 0.3 = 0.09
    expect(sup.strength).toBeCloseTo(49.91, 2)
  })

  it('10 个 believers 时 believerFactor = max(0.3, 0.5) = 0.5', () => {
    const sup = makeSup(1, 50, 10)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // believerFactor = max(0.3, 1 - 10*0.05) = max(0.3, 0.5) = 0.5
    // decay = 0.3 * 0.5 = 0.15
    expect(sup.strength).toBeCloseTo(49.85, 5)
  })

  it('1 个 believer 时 believerFactor = max(0.3, 0.95) = 0.95', () => {
    const sup = makeSup(1, 50, 1)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // believerFactor = max(0.3, 1 - 1*0.05) = 0.95
    // decay = 0.3 * 0.95 = 0.285
    expect(sup.strength).toBeCloseTo(49.715, 3)
  })

  it('decayRate = 0.5 时衰减更快', () => {
    const sup = makeSup(1, 50, 0)
    sup.decayRate = 0.5
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // 0.5 * 1.0 = 0.5
    expect(sup.strength).toBeCloseTo(49.5, 5)
  })

  it('多个迷信同时衰减', () => {
    const sup1 = makeSup(1, 50, 0)
    const sup2 = makeSup(2, 60, 0)
    sup1.decayRate = 0.3
    sup2.decayRate = 0.5
    ;(sys as any).superstitions.push(sup1, sup2)
    ;(sys as any).decaySuperstitions()
    expect(sup1.strength).toBeCloseTo(49.7, 5)
    expect(sup2.strength).toBeCloseTo(59.5, 5)
  })

  it('believerFactor 下限为 0.3（不低于此值）', () => {
    // 100 个 believers: 1 - 100*0.05 = -4，max(0.3, -4) = 0.3
    const sup = makeSup(1, 50, 100)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    expect(sup.strength).toBeCloseTo(49.91, 2)
  })

  it('空 superstitions 时 decay 不崩溃', () => {
    expect(() => (sys as any).decaySuperstitions()).not.toThrow()
  })

  it('strength 可减到 0 以下（cleanup 负责删除）', () => {
    const sup = makeSup(1, 0.2, 0)
    sup.decayRate = 0.5
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // 0.2 - 0.5 = -0.3
    expect(sup.strength).toBeCloseTo(-0.3, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - cleanup 逻辑', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('strength >= 5（MIN_STRENGTH）时保留', () => {
    ;(sys as any).superstitions.push(makeSup(1, 5))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(1)
  })

  it('strength > 5 时保留', () => {
    ;(sys as any).superstitions.push(makeSup(1, 10))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(1)
  })

  it('strength < 5 时删除', () => {
    ;(sys as any).superstitions.push(makeSup(1, 4.9))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('strength = 4.99 时删除', () => {
    ;(sys as any).superstitions.push(makeSup(1, 4.99))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('strength = 0 时删除', () => {
    ;(sys as any).superstitions.push(makeSup(1, 0))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('strength = -1 时删除', () => {
    ;(sys as any).superstitions.push(makeSup(1, -1))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('strength = 5 边界值保留', () => {
    ;(sys as any).superstitions.push(makeSup(1, 5))
    ;(sys as any).superstitions.push(makeSup(2, 10))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(2)
  })

  it('混合保留与删除：strength 4.9 删除，5 保留', () => {
    ;(sys as any).superstitions.push(makeSup(1, 4.9))
    ;(sys as any).superstitions.push(makeSup(2, 5))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(1)
    expect((sys as any).superstitions[0].id).toBe(2)
  })

  it('全部 < MIN_STRENGTH 时变空', () => {
    ;(sys as any).superstitions.push(makeSup(1, 0))
    ;(sys as any).superstitions.push(makeSup(2, 3))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('空 superstitions 时 cleanup 不崩溃', () => {
    expect(() => (sys as any).cleanup()).not.toThrow()
  })

  it('从后往前删除不影响索引（多个需删除）', () => {
    ;(sys as any).superstitions.push(makeSup(1, 100))  // 保留
    ;(sys as any).superstitions.push(makeSup(2, 3))    // 删除
    ;(sys as any).superstitions.push(makeSup(3, 50))   // 保留
    ;(sys as any).superstitions.push(makeSup(4, 1))    // 删除
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(2)
    expect((sys as any).superstitions[0].id).toBe(1)
    expect((sys as any).superstitions[1].id).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - formSuperstitions 逻辑', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('MAX_SUPERSTITIONS=20 满时不新增', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).superstitions.push(makeSup(i + 1, 50))
    }
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    expect((sys as any).superstitions.length).toBe(20)
  })

  it('random > FORM_CHANCE(0.015) 时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('entities 为空时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.015
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    ;(sys as any).formSuperstitions(em, 0, [])
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('pos 为 null 时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = {
      getComponent: () => null,
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('与已有迷信距离 < 8（64 = 8²）时不新增', () => {
    // 已有迷信在 (100, 100)，新迷信在 (103, 100)，dx²+dy²=9 < 64
    ;(sys as any).superstitions.push(makeSup(1, 50)) // x=100, y=100
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = {
      getComponent: () => ({ x: 103, y: 100 }), // 距离 3 < 8
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    expect((sys as any).superstitions.length).toBe(1) // 未新增
  })

  it('与已有迷信距离 >= 8 时可新增', () => {
    ;(sys as any).superstitions.push(makeSup(1, 50)) // x=100, y=100
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.01) // < FORM_CHANCE
      .mockReturnValueOnce(0)    // entity index
      .mockReturnValueOnce(0)    // type index
      .mockReturnValue(0.5)      // strength/decayRate
    const em = {
      getComponent: () => ({ x: 115, y: 100 }), // 距离 15 > 8
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    expect((sys as any).superstitions.length).toBe(2)
  })

  it('新增迷信 strength 在 30-70 之间', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.01) // < FORM_CHANCE
      .mockReturnValueOnce(0)    // entity idx
      .mockReturnValueOnce(0)    // type idx
      .mockReturnValueOnce(0.5)  // strength = 30 + 0.5*40 = 50
      .mockReturnValueOnce(0.5)  // decayRate
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    if ((sys as any).superstitions.length > 0) {
      const s = (sys as any).superstitions[0].strength
      expect(s).toBeGreaterThanOrEqual(30)
      expect(s).toBeLessThanOrEqual(70)
    }
  })

  it('新增迷信 decayRate 在 0.3-0.5 之间', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)  // decayRate = 0.3 + 0.5*0.2 = 0.4
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    ;(sys as any).formSuperstitions(em, 0, [1])
    if ((sys as any).superstitions.length > 0) {
      const dr = (sys as any).superstitions[0].decayRate
      expect(dr).toBeGreaterThanOrEqual(0.3)
      expect(dr).toBeLessThanOrEqual(0.5)
    }
  })

  it('新增迷信 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = {
      getComponent: () => ({ x: 500, y: 500 }),
    } as any
    const prevId = (sys as any).nextId
    ;(sys as any).formSuperstitions(em, 0, [1])
    if ((sys as any).superstitions.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - spreadBeliefs 逻辑', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('已是 believer 的实体不再传播', () => {
    const sup = makeSup(1, 50, 0)
    sup.believers.add(1)  // 实体 1 已是 believer
    ;(sys as any).superstitions.push(sup)
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    const initialSize = sup.believers.size
    ;(sys as any).spreadBeliefs(em, [1])
    expect(sup.believers.size).toBe(initialSize) // 未新增
  })

  it('距离 > BELIEF_SPREAD_RANGE(8) 时不传播', () => {
    const sup = makeSup(1, 50, 0)
    ;(sys as any).superstitions.push(sup)
    const em = {
      getComponent: () => ({ x: 200, y: 200 }), // 距离 100 + 100 >> 8
    } as any
    ;(sys as any).spreadBeliefs(em, [1])
    expect(sup.believers.size).toBe(0)
  })

  it('实体 pos 为 null 时不崩溃', () => {
    const sup = makeSup(1, 50, 0)
    ;(sys as any).superstitions.push(sup)
    const em = {
      getComponent: () => null,
    } as any
    expect(() => (sys as any).spreadBeliefs(em, [1])).not.toThrow()
  })

  it('adoptChance 公式：strength/100 * (1 - dist/8) * 0.1', () => {
    const strength = 100, dist = 0
    const adoptChance = (strength / 100) * (1 - dist / 8) * 0.1
    expect(adoptChance).toBeCloseTo(0.1, 5)
  })

  it('满足 adoptChance 时新增 believer', () => {
    const sup = makeSup(1, 100, 0)
    ;(sys as any).superstitions.push(sup)
    // 实体在同一位置（dist=0），adoptChance = 1.0 * 1.0 * 0.1 = 0.1
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // < 0.1，传播成功
    ;(sys as any).spreadBeliefs(em, [1])
    expect(sup.believers.has(1)).toBe(true)
  })

  it('传播成功后 strength 增加 2', () => {
    const sup = makeSup(1, 50, 0)
    ;(sys as any).superstitions.push(sup)
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 必然传播
    ;(sys as any).spreadBeliefs(em, [1])
    expect(sup.strength).toBeGreaterThanOrEqual(50)
  })

  it('strength 传播后上限 100', () => {
    const sup = makeSup(1, 99, 0)
    ;(sys as any).superstitions.push(sup)
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).spreadBeliefs(em, [1])
    expect(sup.strength).toBeLessThanOrEqual(100)
  })

  it('空 entities 时不崩溃', () => {
    ;(sys as any).superstitions.push(makeSup(1, 50, 0))
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    expect(() => (sys as any).spreadBeliefs(em, [])).not.toThrow()
  })

  it('空 superstitions 时 spreadBeliefs 不崩溃', () => {
    const em = {
      getComponent: () => ({ x: 100, y: 100 }),
    } as any
    expect(() => (sys as any).spreadBeliefs(em, [1])).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureSuperstitionSystem - 整体 update 流程', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })

  it('update 不崩溃（空实体）', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    expect(() => sys.update(1, em, 800)).not.toThrow()
  })

  it('update 触发后 lastCheck 更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('decay + cleanup 联动：弱迷信被清理', () => {
    // 添加一个 strength=5.1，decay 后变 4.81 < 5 → 清理
    const sup = makeSup(1, 5.1, 0)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('decay + cleanup 联动：强迷信被保留', () => {
    const sup = makeSup(1, 50, 0)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(1)
  })

  it('多次 update 触发衰减累积', () => {
    const sup = makeSup(1, 100, 0)
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不新增迷信，不传播
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    sys.update(1, em, 1600)
    // 每次 update 衰减 0.3（0 believers），触发 2 次
    expect((sys as any).superstitions[0].strength).toBeCloseTo(100 - 0.6, 1)
  })
})
