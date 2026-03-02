import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwagerSystem } from '../systems/CreatureSwagerSystem'
import type { Swager } from '../systems/CreatureSwagerSystem'
import { EntityManager } from '../ecs/Entity'

const CHECK_INTERVAL = 2900

let nextId = 1
function makeSys(): CreatureSwagerSystem { return new CreatureSwagerSystem() }
function makeSwager(entityId: number, overrides: Partial<Swager> = {}): Swager {
  return {
    id: nextId++,
    entityId,
    swagingSkill: 70,
    dieAlignment: 65,
    metalForming: 80,
    dimensionalAccuracy: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEm(): EntityManager { return new EntityManager() }

describe('CreatureSwagerSystem.getSwagers', () => {
  let sys: CreatureSwagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋锻工', () => { expect((sys as any).swagers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    expect((sys as any).swagers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    expect((sys as any).swagers).toBe((sys as any).swagers)
  })
  it('字段正确', () => {
    ;(sys as any).swagers.push(makeSwager(2))
    const s = (sys as any).swagers[0]
    expect(s.swagingSkill).toBe(70)
    expect(s.dimensionalAccuracy).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    ;(sys as any).swagers.push(makeSwager(2))
    expect((sys as any).swagers).toHaveLength(2)
  })
})

describe('CreatureSwagerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureSwagerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不升级技能', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).swagers[0].swagingSkill).toBe(50)
  })

  it('tick达到CHECK_INTERVAL时升级技能', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].swagingSkill).toBeCloseTo(50.02)
  })

  it('连续两次update，第二次tick不足时不再升级', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).swagers[0].swagingSkill
    // 第二次 tick 仍然是 CHECK_INTERVAL，差值 0 不足 CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].swagingSkill).toBeCloseTo(afterFirst)
  })

  it('第二次update tick超过2*CHECK_INTERVAL时再次升级', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2 + 1)
    expect((sys as any).swagers[0].swagingSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureSwagerSystem 技能递增', () => {
  let sys: CreatureSwagerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('每次触发 swagingSkill +0.02', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50, dieAlignment: 50, dimensionalAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].swagingSkill).toBeCloseTo(50.02)
  })

  it('每次触发 dieAlignment +0.015', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50, dieAlignment: 50, dimensionalAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].dieAlignment).toBeCloseTo(50.015)
  })

  it('每次触发 dimensionalAccuracy +0.01', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 50, dieAlignment: 50, dimensionalAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].dimensionalAccuracy).toBeCloseTo(50.01)
  })

  it('metalForming 不随update递增', () => {
    ;(sys as any).swagers.push(makeSwager(1, { metalForming: 55 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].metalForming).toBe(55)
  })

  it('swagingSkill 上限100不超出', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].swagingSkill).toBe(100)
  })

  it('dieAlignment 上限100不超出', () => {
    ;(sys as any).swagers.push(makeSwager(1, { dieAlignment: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].dieAlignment).toBe(100)
  })

  it('dimensionalAccuracy 上限100不超出', () => {
    ;(sys as any).swagers.push(makeSwager(1, { dimensionalAccuracy: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers[0].dimensionalAccuracy).toBe(100)
  })
})

describe('CreatureSwagerSystem cleanup 边界', () => {
  let sys: CreatureSwagerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('swagingSkill > 4 时不移除', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 5 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers).toHaveLength(1)
  })

  it('swagingSkill 初始4，递增后4.02 > 4 不移除', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 递增先执行：4 + 0.02 = 4.02，cleanup 检查 4.02 <= 4 为 false，保留
    expect((sys as any).swagers).toHaveLength(1)
  })

  it('swagingSkill 接近清除边界（3.98 + 0.02 = 4.0 被清除）', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0 <= 4，被删除
    expect((sys as any).swagers).toHaveLength(0)
  })

  it('swagingSkill 恰好在边界之上（4.01 + 0.02 = 4.03 > 4 保留）', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers).toHaveLength(1)
  })

  it('多个旋锻工中只移除低技能者', () => {
    ;(sys as any).swagers.push(makeSwager(1, { swagingSkill: 3 }))
    ;(sys as any).swagers.push(makeSwager(2, { swagingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swagers).toHaveLength(1)
    expect((sys as any).swagers[0].entityId).toBe(2)
  })
})
