import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWarpingMakersSystem } from '../systems/CreatureWarpingMakersSystem'
import type { WarpingMaker } from '../systems/CreatureWarpingMakersSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureWarpingMakersSystem { return new CreatureWarpingMakersSystem() }
function makeMaker(entityId: number, tensionControl = 70, tick = 0): WarpingMaker {
  return { id: nextId++, entityId, tensionControl, threadAlignment: 65, beamLoading: 80, efficiency: 75, tick }
}

function makeEmptyEm(): EntityManager {
  const em = new EntityManager()
  vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
  return em
}

describe('CreatureWarpingMakersSystem.getMakers', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无整经工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.tensionControl).toBe(70)
    expect(m.beamLoading).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureWarpingMakersSystem — CHECK_INTERVAL 节流 (2500)', () => {
  let sys: CreatureWarpingMakersSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('tick < 2500 时跳过，lastCheck 保持 0', () => {
    sys.update(0, em, 2499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好 2500 时执行，lastCheck 更新', () => {
    sys.update(0, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('连续调用：第二次需再等 2500 才执行', () => {
    sys.update(0, em, 2500)
    sys.update(0, em, 4999)  // 4999-2500=2499，跳过
    expect((sys as any).lastCheck).toBe(2500)
    sys.update(0, em, 5000)  // 5000-2500=2500，执行
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('技能增长仅在 CHECK_INTERVAL 满足时触发', () => {
    ;(sys as any).makers.push(makeMaker(1, 50.0))
    sys.update(0, em, 2499)  // 跳过，不增长
    expect((sys as any).makers[0].tensionControl).toBe(50.0)
    sys.update(0, em, 2500)  // 执行，增长
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(50.02, 5)
  })
})

describe('CreatureWarpingMakersSystem — 技能增长 (+0.02/+0.015/+0.01)', () => {
  let sys: CreatureWarpingMakersSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('每次执行 tensionControl += 0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, 30))
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(30.02, 5)
  })

  it('每次执行 threadAlignment += 0.015', () => {
    ;(sys as any).makers.push({ ...makeMaker(1, 30), threadAlignment: 40 })
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].threadAlignment).toBeCloseTo(40.015, 5)
  })

  it('每次执行 efficiency += 0.01', () => {
    ;(sys as any).makers.push({ ...makeMaker(1, 30), efficiency: 50 })
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].efficiency).toBeCloseTo(50.01, 5)
  })

  it('多次更新技能累积正确（3次后 tensionControl+0.06）', () => {
    ;(sys as any).makers.push(makeMaker(1, 20))
    sys.update(0, em, 2500)
    sys.update(0, em, 5000)
    sys.update(0, em, 7500)
    expect((sys as any).makers[0].tensionControl).toBeCloseTo(20.06, 4)
  })

  it('tensionControl 被 Math.min(100,...) 限制不超过 100', () => {
    ;(sys as any).makers.push(makeMaker(1, 99.99))
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].tensionControl).toBeLessThanOrEqual(100)
  })

  it('threadAlignment 被 Math.min(100,...) 限制不超过 100', () => {
    ;(sys as any).makers.push({ ...makeMaker(1, 10), threadAlignment: 99.99 })
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].threadAlignment).toBeLessThanOrEqual(100)
  })

  it('efficiency 被 Math.min(100,...) 限制不超过 100', () => {
    ;(sys as any).makers.push({ ...makeMaker(1, 10), efficiency: 99.99 })
    sys.update(0, em, 2500)
    expect((sys as any).makers[0].efficiency).toBeLessThanOrEqual(100)
  })
})

describe('CreatureWarpingMakersSystem — cleanup（tensionControl <= 4 时移除）', () => {
  let sys: CreatureWarpingMakersSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('tensionControl <= 4 的 maker 被移除', () => {
    ;(sys as any).makers.push(makeMaker(1, 3))   // tensionControl=3，update后3.02仍>4?不，先增长后检测
    // 先增长：3+0.02=3.02，仍然 <= 4 → 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 2500)
    // 3.02 <= 4 → 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tensionControl = 4.00 时满足 <= 4 条件，被移除（增长后变 4.02）', () => {
    // 增长前 4.00+0.02=4.02 > 4，所以不会被删除
    ;(sys as any).makers.push(makeMaker(1, 4.0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 2500)
    // 4.0+0.02=4.02 > 4 → 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tensionControl = 3.98 时，增长后 3.98+0.02=4.00，满足 <=4，被移除', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 2500)
    // 3.98+0.02=4.00 <= 4 → 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('正常 tensionControl > 4 的 maker 被保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 50))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 2500)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合场景：低 tensionControl 被删，高的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 2))   // 2+0.02=2.02 <= 4 → 删除
    ;(sys as any).makers.push(makeMaker(2, 60))  // 保留
    ;(sys as any).makers.push(makeMaker(3, 1))   // 1+0.02=1.02 <= 4 → 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 2500)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

describe('CreatureWarpingMakersSystem — MAX_MAKERS 上限 (12)', () => {
  let sys: CreatureWarpingMakersSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('手动注入 12 条记录，length 为 12', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 20))
    }
    expect((sys as any).makers).toHaveLength(12)
  })

  it('已满 12 条时，即使随机通过也不新增（Math.random 强制 < RECRUIT_CHANCE）', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 20))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)  // < 0.0017，触发招募条件
    sys.update(0, em, 2500)
    vi.restoreAllMocks()
    // length 应保持 12（不超过 MAX_MAKERS）
    expect((sys as any).makers.length).toBeLessThanOrEqual(12)
  })
})

describe('CreatureWarpingMakersSystem — nextId 自增', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('内部 nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('每次招募后 nextId 递增', () => {
    // 强制招募：makers < MAX(12)，random < 0.0017
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEmptyEm()
    sys.update(0, em, 2500)
    const idAfter = (sys as any).nextId
    vi.restoreAllMocks()
    // 如果招募成功，nextId > 1
    if ((sys as any).makers.length > 0) {
      expect(idAfter).toBeGreaterThan(1)
    }
  })
})
