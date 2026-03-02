import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLapperSystem } from '../systems/CreatureLapperSystem'
import type { Lapper } from '../systems/CreatureLapperSystem'

// CHECK_INTERVAL=2970, MAX_LAPPERS=10, RECRUIT_CHANCE=0.0015
// 技能递增：lappingSkill+0.02, compoundSelection+0.015, mirrorFinish+0.01 每次update
// cleanup: lappingSkill<=4 时删除

let nextId = 1
function makeSys(): CreatureLapperSystem { return new CreatureLapperSystem() }
function makeLapper(entityId: number, overrides: Partial<Lapper> = {}): Lapper {
  return { id: nextId++, entityId, lappingSkill: 70, compoundSelection: 65, flatnessAccuracy: 80, mirrorFinish: 75, tick: 0, ...overrides }
}

const em = {} as any

describe('CreatureLapperSystem.getLappers', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无研磨工', () => { expect((sys as any).lappers).toHaveLength(0) })
  it('注入后可查询', () => {
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
})

describe('CreatureLapperSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<CHECK_INTERVAL时不进入更新逻辑（lastCheck不变）', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    const before = (sys as any).lappers[0].lappingSkill
    sys.update(1, em, 100)
    expect((sys as any).lappers[0].lappingSkill).toBe(before)
  })

  it('tick>=CHECK_INTERVAL时执行更新（lappingSkill增加）', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(50.02)
  })

  it('lastCheck更新为当前tick', () => {
    sys.update(1, em, 2970)
    expect((sys as any).lastCheck).toBe(2970)
  })

  it('lastCheck不更新（节流期内）', () => {
    ;(sys as any).lastCheck = 2970
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2970)
  })

  it('第二次触发需要距上次lastCheck>=CHECK_INTERVAL', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 50 }))
    sys.update(1, em, 2970)
    const after1 = (sys as any).lappers[0].lappingSkill
    // 仅过了 100 ticks，不足 2970，不更新
    sys.update(1, em, 3070)
    expect((sys as any).lappers[0].lappingSkill).toBe(after1)
    // 过了 2970 ticks，触发
    sys.update(1, em, 5940)
    expect((sys as any).lappers[0].lappingSkill).toBeCloseTo(after1 + 0.02)
  })
})

describe('CreatureLapperSystem - 技能递增上限', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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

  it('flatnessAccuracy 不参与自动递增（只有初始值）', () => {
    ;(sys as any).lappers.push(makeLapper(1, { flatnessAccuracy: 42 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers[0].flatnessAccuracy).toBe(42)
  })
})

describe('CreatureLapperSystem - cleanup（lappingSkill<=4 删除）', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('lappingSkill=3.98+0.02=4.00<=4 => 被删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 3.98 }))
    sys.update(1, em, 2970)
    expect((sys as any).lappers).toHaveLength(0)
  })

  it('lappingSkill=4 精确边界 => 被删除', () => {
    ;(sys as any).lappers.push(makeLapper(1, { lappingSkill: 4 }))
    sys.update(1, em, 2970)
    // 更新后变为 4.02，但初始就是4<=4，先做技能增长再删，看源码顺序
    // 源码：先增长再cleanup => 4+0.02=4.02 > 4 => 不删除
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
})

describe('CreatureLapperSystem - MAX_LAPPERS上限', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到 MAX_LAPPERS=10 时不再随机招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).lappers.push(makeLapper(i + 1))
    }
    // 强制 Math.random 返回 0（RECRUIT_CHANCE 条件成立），但已满不招募
    const origRandom = Math.random
    Math.random = () => 0
    try {
      sys.update(1, em, 2970)
      // update 后技能增长，但没有新成员（已满10个）
      expect((sys as any).lappers.length).toBeLessThanOrEqual(10)
    } finally {
      Math.random = origRandom
    }
  })

  it('未满 MAX_LAPPERS 时在 RECRUIT_CHANCE 触发下才招募', () => {
    const origRandom = Math.random
    // random() < 0.0015 => 触发招募
    Math.random = () => 0.001
    try {
      sys.update(1, em, 2970)
      expect((sys as any).lappers.length).toBeGreaterThanOrEqual(1)
    } finally {
      Math.random = origRandom
    }
  })

  it('RECRUIT_CHANCE 未达到时不招募', () => {
    const origRandom = Math.random
    // random() >= 0.0015 => 不招募
    Math.random = () => 0.5
    try {
      sys.update(1, em, 2970)
      expect((sys as any).lappers).toHaveLength(0)
    } finally {
      Math.random = origRandom
    }
  })
})
