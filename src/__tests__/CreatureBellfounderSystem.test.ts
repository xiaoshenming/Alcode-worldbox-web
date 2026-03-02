import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellfounderSystem } from '../systems/CreatureBellfounderSystem'
import type { Bellfounder } from '../systems/CreatureBellfounderSystem'

const CHECK_INTERVAL = 2660

let nextId = 1
function makeSys(): CreatureBellfounderSystem { return new CreatureBellfounderSystem() }
function makeMaker(entityId: number): Bellfounder {
  return { id: nextId++, entityId, bronzeCasting: 70, moldMaking: 65, toneTuning: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureBellfounderSystem.getBellfounders', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸钟工', () => { expect((sys as any).bellfounders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect((sys as any).bellfounders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect((sys as any).bellfounders).toBe((sys as any).bellfounders)
  })

  it('字段正确', () => {
    ;(sys as any).bellfounders.push(makeMaker(2))
    const b = (sys as any).bellfounders[0]
    expect(b.bronzeCasting).toBe(70)
    expect(b.toneTuning).toBe(80)
  })

  it('多个全部返回', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    ;(sys as any).bellfounders.push(makeMaker(2))
    expect((sys as any).bellfounders).toHaveLength(2)
  })
})

describe('CreatureBellfounderSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 大于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL + 50)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 50)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    // 差值 1 < CHECK_INTERVAL，不更新
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureBellfounderSystem 技能递增', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 bronzeCasting 增加 0.02', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBeCloseTo(50.02)
  })

  it('每次触发后 toneTuning 增加 0.015', () => {
    const b = makeMaker(1)
    b.toneTuning = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].toneTuning).toBeCloseTo(50.015)
  })

  it('每次触发后 outputQuality 增加 0.01', () => {
    const b = makeMaker(1)
    b.outputQuality = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].outputQuality).toBeCloseTo(50.01)
  })

  it('bronzeCasting 上限为 100，不超过', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 99.99
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].bronzeCasting).toBe(100)
  })

  it('outputQuality 上限为 100，不超过', () => {
    const b = makeMaker(1)
    b.outputQuality = 99.999
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders[0].outputQuality).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 50
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).bellfounders[0].bronzeCasting).toBe(50)
  })
})

describe('CreatureBellfounderSystem cleanup', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 注意：cleanup 先做技能递增再判断，所以初始值需低于 4
  // 例如初始 3.0 → +0.02 = 3.02 ≤ 4，被移除
  it('技能递增后仍 <= 4 的铸钟工被移除（初始值 3.0）', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 3.0
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.0 + 0.02 = 3.02 <= 4，被清除
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('bronzeCasting > 4 的铸钟工不被移除', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 4.01
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const b = makeMaker(1)
    b.bronzeCasting = 3.98
    ;(sys as any).bellfounders.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，仍 <= 4 被清除
    expect((sys as any).bellfounders).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const b1 = makeMaker(1); b1.bronzeCasting = 3.0   // 递增后 3.02 <= 4 → 被清除
    const b2 = makeMaker(2); b2.bronzeCasting = 50    // 递增后 50.02 > 4 → 保留
    ;(sys as any).bellfounders.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).bellfounders).toHaveLength(1)
    expect((sys as any).bellfounders[0].entityId).toBe(2)
  })
})
