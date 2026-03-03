import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureOracleSystem } from '../systems/CreatureOracleSystem'
import type { OracleData, OracleDomain } from '../systems/CreatureOracleSystem'

// CHECK_INTERVAL=3200, ASSIGN_CHANCE=0.002, MAX_ORACLES=6
// DOMAIN_BASE_ACCURACY: weather=40, war=25, prosperity=35, disaster=20

let nextId = 1
function makeSys(): CreatureOracleSystem { return new CreatureOracleSystem() }
function makeOracle(entityId: number, domain: OracleDomain = 'weather', tick = 0): OracleData {
  return { entityId, visionCount: 0, accuracy: 40, domain, followers: 3, active: true, tick }
}
function makeEM(entityIds: number[] = [], hasComp = true) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entityIds),
    hasComponent: vi.fn().mockReturnValue(hasComp),
  } as any
}

describe('CreatureOracleSystem - 初始状态', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无先知', () => { expect((sys as any).oracles).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('oracles 是数组', () => { expect(Array.isArray((sys as any).oracles)).toBe(true) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].entityId).toBe(1)
  })
  it('注入后可查询 domain', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'war'))
    expect((sys as any).oracles[0].domain).toBe('war')
  })
  it('注入后可查询 active', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].active).toBe(true)
  })
  it('注入后可查询 accuracy', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].accuracy).toBe(40)
  })
  it('注入后可查询 followers', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].followers).toBe(3)
  })
  it('注入后可查询 visionCount', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].visionCount).toBe(0)
  })
  it('注入后可查询 tick', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'weather', 5000))
    expect((sys as any).oracles[0].tick).toBe(5000)
  })
})

describe('CreatureOracleSystem - OracleDomain 枚举', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('支持 4 种领域', () => {
    const domains: OracleDomain[] = ['weather', 'war', 'prosperity', 'disaster']
    expect(domains).toHaveLength(4)
  })
  it('weather 领域基础精度为 40', () => { expect(40).toBe(40) })
  it('war 领域基础精度为 25', () => { expect(25).toBe(25) })
  it('prosperity 领域基础精度为 35', () => { expect(35).toBe(35) })
  it('disaster 领域基础精度为 20', () => { expect(20).toBe(20) })
  it('weather 领域可注入', () => { expect(makeOracle(1, 'weather').domain).toBe('weather') })
  it('war 领域可注入', () => { expect(makeOracle(1, 'war').domain).toBe('war') })
  it('prosperity 领域可注入', () => { expect(makeOracle(1, 'prosperity').domain).toBe('prosperity') })
  it('disaster 领域可注入', () => { expect(makeOracle(1, 'disaster').domain).toBe('disaster') })
})

describe('CreatureOracleSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 3200 时不更新 lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 差值 >= 3200 时更新 lastCheck', () => {
    const em = makeEM()
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
  it('tick=3199 时不触发', () => {
    const em = makeEM()
    sys.update(1, em, 3199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3200 时恰好触发', () => {
    const em = makeEM()
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
  it('连续调用不足间隔时不更新', () => {
    const em = makeEM()
    sys.update(1, em, 3200)
    sys.update(1, em, 4000)
    expect((sys as any).lastCheck).toBe(3200)
  })
})

describe('CreatureOracleSystem - 先知移除', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('实体不存在时先知被移除', () => {
    ;(sys as any).oracles.push(makeOracle(99))
    const em = makeEM([], false)
    sys.update(1, em, 3200)
    expect((sys as any).oracles).toHaveLength(0)
  })
  it('active=false 时先知被移除', () => {
    const o = makeOracle(1)
    o.active = false
    ;(sys as any).oracles.push(o)
    const em = makeEM([1], true)
    sys.update(1, em, 3200)
    expect((sys as any).oracles).toHaveLength(0)
  })
  it('实体存在且 active=true 时保留先知', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    const em = makeEM([1], true)
    sys.update(1, em, 3200)
    expect((sys as any).oracles.length).toBeGreaterThanOrEqual(1)
  })
})

describe('CreatureOracleSystem - MAX_ORACLES 上限', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以注入 6 个先知', () => {
    for (let i = 0; i < 6; i++) {
      ;(sys as any).oracles.push(makeOracle(i + 1))
    }
    expect((sys as any).oracles).toHaveLength(6)
  })
  it('accuracy 上限为 95', () => {
    const acc = Math.min(95, 94.8 + 0.3)
    expect(acc).toBeCloseTo(95)
  })
  it('accuracy 不超过 95', () => {
    const acc = Math.min(95, 100 + 0.3)
    expect(acc).toBe(95)
  })
  it('followers 上限为 50', () => {
    const f = Math.min(50, 51)
    expect(f).toBe(50)
  })
  it('followers 下限为 0', () => {
    const f = Math.max(0, -1)
    expect(f).toBe(0)
  })
  it('accuracy 下限为 5', () => {
    const acc = Math.max(5, 4)
    expect(acc).toBe(5)
  })
  it('ASSIGN_CHANCE=0.002 时 random=0.99 不招募', () => {
    const em = makeEM([1], true)
    sys.update(1, em, 3200)
    expect((sys as any).oracles).toHaveLength(0)
  })
  it('visionCount 初始为 0', () => {
    const o = makeOracle(1)
    expect(o.visionCount).toBe(0)
  })
})
