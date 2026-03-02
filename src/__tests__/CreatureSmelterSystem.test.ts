import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSmelterSystem } from '../systems/CreatureSmelterSystem'
import type { Smelter } from '../systems/CreatureSmelterSystem'

// CreatureSmelterSystem 测试:
// CHECK_INTERVAL=2770, MAX_SMELTERS=10
// 技能成长: smeltingSkill+0.02, oreKnowledge+0.015, yieldEfficiency+0.01 (上限100)
// cleanup: smeltingSkill <= 4 时移除
// 节流: tick - lastCheck < CHECK_INTERVAL 时跳过

let nextId = 1
function makeSys(): CreatureSmelterSystem { return new CreatureSmelterSystem() }
function makeSmelter(entityId: number, overrides: Partial<Smelter> = {}): Smelter {
  return {
    id: nextId++,
    entityId,
    smeltingSkill: 70,
    oreKnowledge: 65,
    heatManagement: 80,
    yieldEfficiency: 75,
    tick: 0,
    ...overrides,
  }
}

function makeEm(overrides: Record<string, any> = {}) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(undefined),
    hasComponent: vi.fn().mockReturnValue(true),
    ...overrides,
  }
}

describe('CreatureSmelterSystem — 初始状态', () => {
  let sys: CreatureSmelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冶炼工', () => { expect((sys as any).smelters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    expect((sys as any).smelters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    expect((sys as any).smelters).toBe((sys as any).smelters)
  })
  it('字段正确', () => {
    ;(sys as any).smelters.push(makeSmelter(2))
    const s = (sys as any).smelters[0]
    expect(s.smeltingSkill).toBe(70)
    expect(s.heatManagement).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    ;(sys as any).smelters.push(makeSmelter(2))
    expect((sys as any).smelters).toHaveLength(2)
  })
})

describe('CreatureSmelterSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureSmelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不更新技能', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 100) // 100 < 2770
    expect((sys as any).smelters[0].smeltingSkill).toBe(70)
  })

  it('tick 达到 CHECK_INTERVAL 时执行更新', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770) // 2770 - 0 >= 2770
    expect((sys as any).smelters[0].smeltingSkill).toBeCloseTo(70.02, 5)
  })

  it('更新后 lastCheck 更新为当前 tick', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('节流期间 lastCheck 不变', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 3000
    sys.update(1, em as any, 3100) // 3100 - 3000 < 2770
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureSmelterSystem — 技能成长上限', () => {
  let sys: CreatureSmelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('smeltingSkill 每次+0.02', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].smeltingSkill).toBeCloseTo(50.02, 5)
  })

  it('oreKnowledge 每次+0.015', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { oreKnowledge: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].oreKnowledge).toBeCloseTo(40.015, 5)
  })

  it('yieldEfficiency 每次+0.01', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { yieldEfficiency: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].yieldEfficiency).toBeCloseTo(30.01, 5)
  })

  it('smeltingSkill 上限为100不超过', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].smeltingSkill).toBe(100)
  })

  it('oreKnowledge 上限为100不超过', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { oreKnowledge: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].oreKnowledge).toBe(100)
  })

  it('多个冶炼工同时成长', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 50 }))
    ;(sys as any).smelters.push(makeSmelter(2, { smeltingSkill: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters[0].smeltingSkill).toBeCloseTo(50.02, 5)
    expect((sys as any).smelters[1].smeltingSkill).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureSmelterSystem — cleanup 边界', () => {
  let sys: CreatureSmelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('smeltingSkill > 4 时保留冶炼工', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters).toHaveLength(1)
  })

  it('smeltingSkill = 4 时移除冶炼工(边界值<=4)', () => {
    const em = makeEm()
    // 注入一个smeltingSkill=3.98的冶炼工，update+0.02=4.00，恰好<=4被移除
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    // 3.98 + 0.02 = 4.00 => <= 4 => 移除
    expect((sys as any).smelters).toHaveLength(0)
  })

  it('smeltingSkill 刚好在阈值上方时不移除(4.01)', () => {
    const em = makeEm()
    // 注入smeltingSkill=3.99, +0.02=4.01, > 4 保留
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 3.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    // 3.99 + 0.02 = 4.01 > 4 => 保留
    expect((sys as any).smelters).toHaveLength(1)
  })

  it('混合情况: 高技能保留低技能移除', () => {
    const em = makeEm()
    ;(sys as any).smelters.push(makeSmelter(1, { smeltingSkill: 2 }))  // 移除
    ;(sys as any).smelters.push(makeSmelter(2, { smeltingSkill: 50 })) // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 2770)
    expect((sys as any).smelters).toHaveLength(1)
    expect((sys as any).smelters[0].entityId).toBe(2)
  })

  it('MAX_SMELTERS=10 容量限制有效', () => {
    const em = makeEm()
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).smelters.push(makeSmelter(i, { smeltingSkill: 50 }))
    }
    expect((sys as any).smelters).toHaveLength(10)
    // update时随机招募受MAX_SMELTERS=10限制
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 触发招募条件
    sys.update(1, em as any, 2770)
    vi.restoreAllMocks()
    expect((sys as any).smelters.length).toBeLessThanOrEqual(10)
  })
})
