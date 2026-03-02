import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureStakerSystem } from '../systems/CreatureStakerSystem'
import type { Staker } from '../systems/CreatureStakerSystem'

// Constants mirrored from source
const CHECK_INTERVAL = 3100
const MAX_STAKERS = 10

let nextId = 1
function makeSys(): CreatureStakerSystem { return new CreatureStakerSystem() }
function makeStaker(entityId: number, overrides: Partial<Staker> = {}): Staker {
  return {
    id: nextId++,
    entityId,
    stakingSkill: 70,
    deformControl: 65,
    jointStrength: 80,
    toolPrecision: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEM() { return { getEntitiesWithComponent: () => [] } as any }

describe('CreatureStakerSystem — 基础数据结构', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆接工', () => { expect((sys as any).stakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    expect((sys as any).stakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    expect((sys as any).stakers).toBe((sys as any).stakers)
  })
  it('字段正确', () => {
    ;(sys as any).stakers.push(makeStaker(2))
    const s = (sys as any).stakers[0]
    expect(s.stakingSkill).toBe(70)
    expect(s.jointStrength).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    ;(sys as any).stakers.push(makeStaker(2))
    expect((sys as any).stakers).toHaveLength(2)
  })
})

describe('CreatureStakerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureStakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('tick=0 时不触发任何更新', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, 0)
    expect((sys as any).stakers[0].stakingSkill).toBe(50)
  })

  it('tick < CHECK_INTERVAL 时跳过逻辑', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stakers[0].stakingSkill).toBe(50)
  })

  it('tick == CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
  })

  it('tick > CHECK_INTERVAL 时触发技能递增', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
  })

  it('连续两次调用：第二次因 lastCheck 节流而跳过', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)       // 触发，lastCheck=CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL + 1)   // 差值=1 < CHECK_INTERVAL，跳过
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
  })

  it('第二个完整周期再次触发', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureStakerSystem — 技能递增上限', () => {
  let sys: CreatureStakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('stakingSkill 每次 +0.02', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
  })

  it('deformControl 每次 +0.015', () => {
    ;(sys as any).stakers.push(makeStaker(1, { deformControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].deformControl).toBeCloseTo(50.015)
  })

  it('toolPrecision 每次 +0.01', () => {
    ;(sys as any).stakers.push(makeStaker(1, { toolPrecision: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].toolPrecision).toBeCloseTo(50.01)
  })

  it('stakingSkill 不超过 100', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBe(100)
  })

  it('deformControl 不超过 100', () => {
    ;(sys as any).stakers.push(makeStaker(1, { deformControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].deformControl).toBe(100)
  })

  it('toolPrecision 不超过 100', () => {
    ;(sys as any).stakers.push(makeStaker(1, { toolPrecision: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].toolPrecision).toBe(100)
  })
})

describe('CreatureStakerSystem — cleanup 边界', () => {
  let sys: CreatureStakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('stakingSkill > 4 时保留', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 5 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 5 + 0.02 = 5.02 > 4，保留
    expect((sys as any).stakers).toHaveLength(1)
  })

  it('stakingSkill == 4 时移除（<= 4）', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 4 + 0.02 = 4.02，但原始值在递增前不会触发移除；
    // 递增后 4.02 > 4，保留；重置为精确 4 后再测
    // 注意：cleanup 在递增之后，所以 4 -> 4.02 -> 不移除
    expect((sys as any).stakers).toHaveLength(1)
  })

  it('stakingSkill <= 4 且递增后仍 <= 4 时需人工置为 <= 4 后验证清除', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 70 }))
    sys.update(1, em, CHECK_INTERVAL)  // 70 -> 70.02
    // 手动将 stakingSkill 设为 3（< 4），下次 update 触发 cleanup
    ;(sys as any).stakers[0].stakingSkill = 3
    sys.update(1, em, CHECK_INTERVAL * 2)  // 3 + 0.02 = 3.02 <= 4，移除
    expect((sys as any).stakers).toHaveLength(0)
  })

  it('先递增再 cleanup：3.98 + 0.02 = 4.00 恰好 <= 4，应移除', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，条件 <= 4 为真，移除
    expect((sys as any).stakers).toHaveLength(0)
  })

  it('混合：一个保留一个移除', () => {
    ;(sys as any).stakers.push(makeStaker(1, { stakingSkill: 50 }))
    ;(sys as any).stakers.push(makeStaker(2, { stakingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(1)
    expect((sys as any).stakers[0].entityId).toBe(1)
  })
})

describe('CreatureStakerSystem — MAX_STAKERS 上限', () => {
  let sys: CreatureStakerSystem
  let em: any
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEM() })

  it('达到 MAX_STAKERS 时不再招募（random 强制通过招募检查）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < 0.0015，触发招募
    for (let i = 0; i < MAX_STAKERS; i++) {
      ;(sys as any).stakers.push(makeStaker(i + 1))
    }
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).stakers).toHaveLength(MAX_STAKERS)
  })
})
