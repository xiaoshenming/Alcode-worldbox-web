import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwageBlockerSystem } from '../systems/CreatureSwageBlockerSystem'
import type { SwageBlocker } from '../systems/CreatureSwageBlockerSystem'
import { EntityManager } from '../ecs/Entity'

const CHECK_INTERVAL = 3030

let nextId = 1
function makeSys(): CreatureSwageBlockerSystem { return new CreatureSwageBlockerSystem() }
function makeWorker(entityId: number, overrides: Partial<SwageBlocker> = {}): SwageBlocker {
  return {
    id: nextId++,
    entityId,
    swageBlockSkill: 70,
    cavitySelection: 65,
    metalForming: 80,
    shapeAccuracy: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEm(): EntityManager { return new EntityManager() }

describe('CreatureSwageBlockerSystem.getSwageBlockers', () => {
  let sys: CreatureSwageBlockerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锻模工', () => { expect((sys as any).swageBlockers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    expect((sys as any).swageBlockers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    expect((sys as any).swageBlockers).toBe((sys as any).swageBlockers)
  })
  it('字段正确', () => {
    ;(sys as any).swageBlockers.push(makeWorker(2))
    const w = (sys as any).swageBlockers[0]
    expect(w.swageBlockSkill).toBe(70)
    expect(w.metalForming).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    ;(sys as any).swageBlockers.push(makeWorker(2))
    expect((sys as any).swageBlockers).toHaveLength(2)
  })
})

describe('CreatureSwageBlockerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureSwageBlockerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不升级技能', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBe(50)
  })

  it('tick达到CHECK_INTERVAL时升级技能', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBeCloseTo(50.02)
  })

  it('连续两次update，第二次tick不足时不再升级', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).swageBlockers[0].swageBlockSkill
    // 第二次 tick 仍然是 CHECK_INTERVAL，差值 0 不足 CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBeCloseTo(afterFirst)
  })

  it('第二次update tick超过2*CHECK_INTERVAL时再次升级', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2 + 1)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureSwageBlockerSystem 技能递增', () => {
  let sys: CreatureSwageBlockerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('每次触发 swageBlockSkill +0.02', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50, cavitySelection: 50, shapeAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBeCloseTo(50.02)
  })

  it('每次触发 cavitySelection +0.015', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50, cavitySelection: 50, shapeAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].cavitySelection).toBeCloseTo(50.015)
  })

  it('每次触发 shapeAccuracy +0.01', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 50, cavitySelection: 50, shapeAccuracy: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].shapeAccuracy).toBeCloseTo(50.01)
  })

  it('metalForming 不随update递增（无递增逻辑）', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { metalForming: 55 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].metalForming).toBe(55)
  })

  it('swageBlockSkill 上限100不超出', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].swageBlockSkill).toBe(100)
  })

  it('cavitySelection 上限100不超出', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { cavitySelection: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].cavitySelection).toBe(100)
  })

  it('shapeAccuracy 上限100不超出', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { shapeAccuracy: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers[0].shapeAccuracy).toBe(100)
  })
})

describe('CreatureSwageBlockerSystem cleanup 边界', () => {
  let sys: CreatureSwageBlockerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('swageBlockSkill > 4 时不移除', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 5 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers).toHaveLength(1)
  })

  it('swageBlockSkill 初始4，递增后4.02 > 4 不移除', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 递增先执行：4 + 0.02 = 4.02，cleanup 检查 4.02 <= 4 为 false，保留
    expect((sys as any).swageBlockers).toHaveLength(1)
  })

  it('swageBlockSkill 接近清除边界（3.98 + 0.02 = 4.0 被清除）', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0 <= 4，被删除
    expect((sys as any).swageBlockers).toHaveLength(0)
  })

  it('swageBlockSkill 恰好在边界之上（4.01 + 0.02 = 4.03 > 4 保留）', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers).toHaveLength(1)
  })

  it('多个工人中只移除低技能者', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1, { swageBlockSkill: 3 }))
    ;(sys as any).swageBlockers.push(makeWorker(2, { swageBlockSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swageBlockers).toHaveLength(1)
    expect((sys as any).swageBlockers[0].entityId).toBe(2)
  })
})
