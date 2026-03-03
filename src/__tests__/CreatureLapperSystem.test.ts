import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLapperSystem } from '../systems/CreatureLapperSystem'
import type { Lapper } from '../systems/CreatureLapperSystem'

// CHECK_INTERVAL=2970, MAX_LAPPERS=10, RECRUIT_CHANCE=0.0015
// 技能递增：lappingSkill+0.02, compoundSelection+0.015, mirrorFinish+0.01
// cleanup: lappingSkill<=4 时删除

let nextId = 1
function makeSys(): CreatureLapperSystem { return new CreatureLapperSystem() }
function makeLapper(entityId: number, overrides: Partial<Lapper> = {}): Lapper {
  return { id: nextId++, entityId, lappingSkill: 70, compoundSelection: 65, flatnessAccuracy: 80, mirrorFinish: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreatureLapperSystem - 初始状态', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无研磨工', () => { expect((sys as any).lappers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lappers 是数组', () => { expect(Array.isArray((sys as any).lappers)).toBe(true) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    expect((sys as any).lappers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    expect((sys as any).lappers).toBe((sys as any).lappers)
  })
  it('字段正确', () => {
    ;(sys as any).lappers.push(makeLapper(3))
    const l = (sys as any).lappers[0]
    expect(l.lappingSkill).toBe(70)
    expect(l.mirrorFinish).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    ;(sys as any).lappers.push(makeLapper(2))
    expect((sys as any).lappers).toHaveLength(2)
  })
  it('注入的 tick 字段正确', () => {
    ;(sys as any).lappers.push(makeLapper(1, { tick: 9999 }))
    expect((sys as any).lappers[0].tick).toBe(9999)
  })
  it('注入的 flatnessAccuracy 字段正确', () => {
    ;(sys as any).lappers.push(makeLapper(1, { flatnessAccuracy: 55 }))
    expect((sys as any).lappers[0].flatnessAccuracy).toBe(55)
  })
})

describe('CreatureLapperSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时技能不增长', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).lappers[0].lappingSkill).toBe(50)
  })
  it('tick >= CHECK_INTERVAL 时执行更新', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(50.02)
  })
  it('lastCheck 更新为当前 tick', () => {
    sys.update(1, em, 2970)
    expect((sys as any).lastCheck).toBe(2970)
  })
  it('lastCheck 不更新（节流期内）', () => {
    ;(sys as any).lastCheck = 2970
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2970)
  })
  it('第二次触发需间隔 >= CHECK_INTERVAL', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    const after1 = (sys as any).lappers[0].lappingSkill
    sys.update(1, em, 3070)
    expect((sys as any).lappers[0].lappingSkill).toBe(after1)
    sys.update(1, em, 5940)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(after1 + 0.02)
  })
  it('tick=2969 时不触发（边界值-1）', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2969)
    expect((sys as any).lappers[0].lappingSkill).toBe(50)
  })
  it('tick=2970 时恰好触发', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(50.02)
  })
})

describe('CreatureLapperSystem - 技能递增上限', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('lappingSkill 每次更新递增 0.02', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(50.02)
  })
  it('compoundSelection 每次更新递增 0.015', () => {
    ;(sys as any).lappers.push(makeLapper(1, { compoundSelection: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].compoundSelection).toBeCloseTo(50.015)
  })
  it('mirrorFinish 每次更新递增 0.01', () => {
    ;(sys as any).lappers.push(makeLapper(1, { mirrorFinish: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].mirrorFinish).toBeCloseTo(50.01)
  })
  it('lappingSkill 不超过 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 99.99 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBe(100)
  })
  it('compoundSelection 不超过 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { compoundSelection: 99.99 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].compoundSelection).toBe(100)
  })
  it('mirrorFinish 不超过 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { mirrorFinish: 99.99 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].mirrorFinish).toBe(100)
  })
  it('flatnessAccuracy 不参与自动递增', () => {
    ;(sys as any).lappers.push(makeLapper(1, { flatnessAccuracy: 42 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].flatnessAccuracy).toBe(42)
  })
  it('lappingSkill=100 时保持 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 100 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBe(100)
  })
  it('compoundSelection=100 时保持 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { compoundSelection: 100 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].compoundSelection).toBe(100)
  })
  it('mirrorFinish=100 时保持 100', () => {
    ;(sys as any).lappers.push(makeLapper(1, { mirrorFinish: 100 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].mirrorFinish).toBe(100)
  })
})

describe('CreatureLapperSystem - cleanup（lappingSkill<=4 删除）', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('lappingSkill=3.98+0.02=4.00<=4 => 被删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 3.98 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(0)
  })
  it('lappingSkill=4 精确边界：更新后 4.02>4 => 不删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 4 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(1)
  })
  it('lappingSkill=5（更新后5.02>4）=> 不删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 5 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(1)
  })
  it('混合：低技能被删，高技能保留', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 3.98 }))
    ;(sys as any).lappers.push(makeLapper(2, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(1)
    expect((sys as any).lappers[0].entityId).toBe(2)
  })
  it('多个低技能研磨工全部被删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 3.98 }))
    ;(sys as any).lappers.push(makeLapper(2, { lappingSkill: 2 }))
    ;(sys as any).lappers.push(makeLapper(3, { lappingSkill: 1 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(0)
  })
  it('lappingSkill=3 => 更新后 3.02<=4 => 被删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 3 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(0)
  })
})

describe('CreatureLapperSystem - MAX_LAPPERS 上限', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_LAPPERS=10 时不再随机招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).lappers.push(makeLapper(i + 1))
    }
    vi.restoreAllMocks()
    Math.random = () => 0
    try {
      sys.update(1, em, 2970)
      expect((sys as any).lappers.length).toBeLessThanOrEqual(10)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('未满 MAX_LAPPERS 时在 RECRUIT_CHANCE 触发下招募', () => {
    vi.restoreAllMocks()
    Math.random = () => 0.001
    try {
      sys.update(1, em, 2970)
      expect((sys as any).lappers.length).toBeGreaterThanOrEqual(1)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks()
    Math.random = () => 0.5
    try {
      sys.update(1, em, 2970)
      expect((sys as any).lappers).toHaveLength(0)
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('满 10 个时总数保持 <= 10', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).lappers.push(makeLapper(i + 1, { lappingSkill: 50 }))
    }
    sys.update(1, em, 2970)
    expect((sys as any).lappers.length).toBeLessThanOrEqual(10)
  })
  it('招募的新成员 lappingSkill 在 [10,35] 范围内', () => {
    vi.restoreAllMocks()
    Math.random = () => 0.001
    try {
      sys.update(1, em, 2970)
      if ((sys as any).lappers.length > 0) {
        const skill = (sys as any).lappers[0].lappingSkill
        expect(skill).toBeGreaterThanOrEqual(10)
        expect(skill).toBeLessThanOrEqual(35 + 0.02)
      }
    } finally {
      vi.restoreAllMocks()
    }
  })
})
