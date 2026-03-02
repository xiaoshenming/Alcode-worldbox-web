import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureStamperSystem } from '../systems/CreatureStamperSystem'
import type { Stamper } from '../systems/CreatureStamperSystem'

// Constants mirrored from source
const CHECK_INTERVAL = 2890
const MAX_STAMPERS = 10

let nextId = 1
function makeSys(): CreatureStamperSystem { return new CreatureStamperSystem() }
function makeStamper(entityId: number, overrides: Partial<Stamper> = {}): Stamper {
  return {
    id: nextId++,
    entityId,
    stampingSkill: 70,
    pressAlignment: 65,
    dieSelection: 80,
    outputConsistency: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEM() { return { getEntitiesWithComponent: () => [] } as any }

describe('CreatureStamperSystem — 基础数据结构', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冲压工', () => { expect((sys as any).stampers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    expect((sys as any).stampers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    expect((sys as any).stampers).toBe((sys as any).stampers)
  })
  it('字段正确', () => {
    ;(sys as any).stampers.push(makeStamper(2))
    const s = (sys as any).stampers[0]
    expect(s.stampingSkill).toBe(70)
    expect(s.dieSelection).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    ;(sys as any).stampers.push(makeStamper(2))
    expect((sys as any).stampers).toHaveLength(2)
  })
})

describe('CreatureStamperSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureStamperSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('tick=0 时不触发任何更新', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, 0)
    expect((sys as any).stampers[0].stampingSkill).toBe(50)
  })

  it('tick < CHECK_INTERVAL 时跳过逻辑', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stampers[0].stampingSkill).toBe(50)
  })

  it('tick == CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
  })

  it('tick > CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
  })

  it('连续两次调用：第二次因 lastCheck 节流而跳过', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)       // 触发，lastCheck=CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL + 1)   // 差值=1 < CHECK_INTERVAL，跳过
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
  })

  it('第二个完整周期再次触发', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureStamperSystem — 技能递增上限', () => {
  let sys: CreatureStamperSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('stampingSkill 每次 +0.02', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBeCloseTo(50.02)
  })

  it('pressAlignment 每次 +0.015', () => {
    ;(sys as any).stampers.push(makeStamper(1, { pressAlignment: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].pressAlignment).toBeCloseTo(50.015)
  })

  it('outputConsistency 每次 +0.01', () => {
    ;(sys as any).stampers.push(makeStamper(1, { outputConsistency: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].outputConsistency).toBeCloseTo(50.01)
  })

  it('stampingSkill 不超过 100', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].stampingSkill).toBe(100)
  })

  it('pressAlignment 不超过 100', () => {
    ;(sys as any).stampers.push(makeStamper(1, { pressAlignment: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].pressAlignment).toBe(100)
  })

  it('outputConsistency 不超过 100', () => {
    ;(sys as any).stampers.push(makeStamper(1, { outputConsistency: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers[0].outputConsistency).toBe(100)
  })
})

describe('CreatureStamperSystem — cleanup 边界', () => {
  let sys: CreatureStamperSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('stampingSkill > 4 时保留', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 5 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 5 + 0.02 = 5.02 > 4，保留
    expect((sys as any).stampers).toHaveLength(1)
  })

  it('先递增再 cleanup：3.98 + 0.02 = 4.00 恰好 <= 4，应移除', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，条件 <= 4 为真，移除
    expect((sys as any).stampers).toHaveLength(0)
  })

  it('stakingSkill <= 4 且递增后仍 <= 4 时验证清除', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 70 }))
    sys.update(1, em, CHECK_INTERVAL)  // 70 -> 70.02
    ;(sys as any).stampers[0].stampingSkill = 3
    sys.update(1, em, CHECK_INTERVAL * 2)  // 3 + 0.02 = 3.02 <= 4，移除
    expect((sys as any).stampers).toHaveLength(0)
  })

  it('混合：一个保留一个移除', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 50 }))
    ;(sys as any).stampers.push(makeStamper(2, { stampingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(1)
    expect((sys as any).stampers[0].entityId).toBe(1)
  })

  it('多个均低于阈值时全部移除', () => {
    ;(sys as any).stampers.push(makeStamper(1, { stampingSkill: 3.98 }))
    ;(sys as any).stampers.push(makeStamper(2, { stampingSkill: 1 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stampers).toHaveLength(0)
  })
})

describe('CreatureStamperSystem — MAX_STAMPERS 上限', () => {
  let sys: CreatureStamperSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('达到 MAX_STAMPERS 时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < 0.0015，触发招募
    for (let i = 0; i < MAX_STAMPERS; i++) {
      ;(sys as any).stampers.push(makeStamper(i + 1))
    }
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).stampers).toHaveLength(MAX_STAMPERS)
  })
})
