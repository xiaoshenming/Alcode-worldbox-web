import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwedgerSystem } from '../systems/CreatureSwedgerSystem'
import type { Swedger } from '../systems/CreatureSwedgerSystem'
import { EntityManager } from '../ecs/Entity'

const CHECK_INTERVAL = 3070

let nextId = 1
function makeSys(): CreatureSwedgerSystem { return new CreatureSwedgerSystem() }
function makeSwedger(entityId: number, overrides: Partial<Swedger> = {}): Swedger {
  return {
    id: nextId++,
    entityId,
    swedgingSkill: 70,
    dieAlignment: 65,
    diameterReduction: 80,
    surfaceFinish: 75,
    tick: 0,
    ...overrides,
  }
}
function makeEm(): EntityManager { return new EntityManager() }

describe('CreatureSwedgerSystem.getSwedgers', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缩径工', () => { expect((sys as any).swedgers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    expect((sys as any).swedgers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    expect((sys as any).swedgers).toBe((sys as any).swedgers)
  })
  it('字段正确', () => {
    ;(sys as any).swedgers.push(makeSwedger(2))
    const s = (sys as any).swedgers[0]
    expect(s.swedgingSkill).toBe(70)
    expect(s.diameterReduction).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    ;(sys as any).swedgers.push(makeSwedger(2))
    expect((sys as any).swedgers).toHaveLength(2)
  })
})

describe('CreatureSwedgerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureSwedgerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不升级技能', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).swedgers[0].swedgingSkill).toBe(50)
  })

  it('tick达到CHECK_INTERVAL时升级技能', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.02)
  })

  it('连续两次update，第二次tick不足时不再升级', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).swedgers[0].swedgingSkill
    // 第二次 tick 仍然是 CHECK_INTERVAL，差值 0 不足 CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(afterFirst)
  })

  it('第二次update tick超过2*CHECK_INTERVAL时再次升级', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2 + 1)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureSwedgerSystem 技能递增', () => {
  let sys: CreatureSwedgerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('每次触发 swedgingSkill +0.02', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50, dieAlignment: 50, surfaceFinish: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBeCloseTo(50.02)
  })

  it('每次触发 dieAlignment +0.015', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50, dieAlignment: 50, surfaceFinish: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].dieAlignment).toBeCloseTo(50.015)
  })

  it('每次触发 surfaceFinish +0.01', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 50, dieAlignment: 50, surfaceFinish: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].surfaceFinish).toBeCloseTo(50.01)
  })

  it('diameterReduction 不随update递增', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { diameterReduction: 55 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].diameterReduction).toBe(55)
  })

  it('swedgingSkill 上限100不超出', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].swedgingSkill).toBe(100)
  })

  it('dieAlignment 上限100不超出', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { dieAlignment: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].dieAlignment).toBe(100)
  })

  it('surfaceFinish 上限100不超出', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { surfaceFinish: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers[0].surfaceFinish).toBe(100)
  })
})

describe('CreatureSwedgerSystem cleanup 边界', () => {
  let sys: CreatureSwedgerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); nextId = 1 })

  it('swedgingSkill > 4 时不移除', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 5 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
  })

  it('swedgingSkill 初始4，递增后4.02 > 4 不移除', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 递增先执行：4 + 0.02 = 4.02，cleanup 检查 4.02 <= 4 为 false，保留
    expect((sys as any).swedgers).toHaveLength(1)
  })

  it('swedgingSkill 接近清除边界（3.98 + 0.02 = 4.0 被清除）', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0 <= 4，被删除
    expect((sys as any).swedgers).toHaveLength(0)
  })

  it('swedgingSkill 恰好在边界之上（4.01 + 0.02 = 4.03 > 4 保留）', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
  })

  it('多个缩径工中只移除低技能者', () => {
    ;(sys as any).swedgers.push(makeSwedger(1, { swedgingSkill: 3 }))
    ;(sys as any).swedgers.push(makeSwedger(2, { swedgingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).swedgers).toHaveLength(1)
    expect((sys as any).swedgers[0].entityId).toBe(2)
  })
})
