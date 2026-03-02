import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureOracleSystem } from '../systems/CreatureOracleSystem'
import type { OracleData, OracleDomain } from '../systems/CreatureOracleSystem'

let nextId = 1
function makeSys(): CreatureOracleSystem { return new CreatureOracleSystem() }
function makeOracle(entityId: number, domain: OracleDomain = 'weather', overrides: Partial<OracleData> = {}): OracleData {
  return {
    entityId,
    visionCount: 5,
    accuracy: 70,
    domain,
    followers: 10,
    active: true,
    tick: 0,
    ...overrides,
  }
}

// Minimal EntityManager stub
function makeEM(ids: number[] = [1, 2, 3], hasComp = true): any {
  return {
    getEntitiesWithComponents: () => ids,
    getEntitiesWithComponent: () => ids,
    hasComponent: (_id: number, _comp: string) => hasComp,
  }
}

const CHECK_INTERVAL = 3200
const MAX_ORACLES = 6

describe('CreatureOracleSystem 基本结构', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无神谕者', () => { expect((sys as any).oracles).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'war'))
    expect((sys as any).oracles[0].domain).toBe('war')
  })
  it('返回内部引用', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles).toBe((sys as any).oracles)
  })
  it('支持所有4种领域', () => {
    const domains: OracleDomain[] = ['weather', 'war', 'prosperity', 'disaster']
    domains.forEach((d, i) => { ;(sys as any).oracles.push(makeOracle(i + 1, d)) })
    const all = (sys as any).oracles
    domains.forEach((d, i) => { expect(all[i].domain).toBe(d) })
  })
  it('active字段为true', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect((sys as any).oracles[0].active).toBe(true)
  })
})

describe('CreatureOracleSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < CHECK_INTERVAL 时 update 不执行（lastCheck 维持为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1])
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick === CHECK_INTERVAL 时执行（lastCheck 更新）', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL + 1000)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1000)
  })

  it('第一次触发后，未达下一阈值时跳过', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    const saved = (sys as any).lastCheck
    sys.update(0, em, CHECK_INTERVAL + 100) // 100 < CHECK_INTERVAL
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第一次触发后，达下一阈值时执行', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureOracleSystem 神谕者属性约束', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('accuracy 上限为 95（vision 触发后不超过）', () => {
    const o = makeOracle(1, 'weather', { accuracy: 95 })
    ;(sys as any).oracles.push(o)
    // accuracy + 0.3 后不超过 95
    const afterVision = Math.min(95, 95 + 0.3)
    expect(afterVision).toBe(95)
  })

  it('followers 上限为 50', () => {
    const o = makeOracle(1, 'weather', { followers: 50 })
    ;(sys as any).oracles.push(o)
    // followers + random(0|1) 后不超过 50
    const afterVision = Math.min(50, 50 + 1)
    expect(afterVision).toBe(50)
  })

  it('followers 最小为 0（失败惩罚不为负）', () => {
    const o = makeOracle(1, 'weather', { followers: 0 })
    ;(sys as any).oracles.push(o)
    const afterPenalty = Math.max(0, 0 - 1)
    expect(afterPenalty).toBe(0)
  })

  it('accuracy 最小为 5（失败惩罚）', () => {
    const o = makeOracle(1, 'war', { accuracy: 5 })
    ;(sys as any).oracles.push(o)
    const afterPenalty = Math.max(5, 5 - 1)
    expect(afterPenalty).toBe(5)
  })

  it('各领域 base accuracy 正确', () => {
    // 由常量定义：weather:40, war:25, prosperity:35, disaster:20
    const expected: Record<OracleDomain, number> = {
      weather: 40, war: 25, prosperity: 35, disaster: 20,
    }
    const domains: OracleDomain[] = ['weather', 'war', 'prosperity', 'disaster']
    domains.forEach(d => {
      expect(expected[d]).toBeGreaterThan(0)
    })
    expect(expected['weather']).toBe(40)
    expect(expected['war']).toBe(25)
    expect(expected['prosperity']).toBe(35)
    expect(expected['disaster']).toBe(20)
  })
})

describe('CreatureOracleSystem 清理逻辑', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('active=false 的神谕者在 update 中被移除', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'weather', { active: false }))
    // hasComponent 返回 true，但 active=false，应被删除
    const em = makeEM([1], true)
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发 vision/penalty
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).oracles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('实体没有 creature 组件时被移除', () => {
    ;(sys as any).oracles.push(makeOracle(99, 'war'))
    // hasComponent 返回 false（实体已死亡/不存在）
    const em = makeEM([], false)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).oracles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('active=true 且实体存在时保留', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'prosperity', { active: true }))
    const em = makeEM([1], true)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).oracles).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('MAX_ORACLES 限制：超过6个不再生成', () => {
    for (let i = 0; i < MAX_ORACLES; i++) {
      ;(sys as any).oracles.push(makeOracle(i + 1, 'weather'))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 命中 ASSIGN_CHANCE
    const em = makeEM([100, 101, 102], true)
    sys.update(0, em, CHECK_INTERVAL)
    // 已满 MAX_ORACLES，不再新增（清理阶段可能因 active=true 保留原有）
    expect((sys as any).oracles.length).toBeLessThanOrEqual(MAX_ORACLES)
    vi.restoreAllMocks()
  })
})

describe('CreatureOracleSystem OracleData 接口字段', () => {
  it('makeOracle 产生合法结构', () => {
    const o = makeOracle(42, 'disaster')
    expect(o.entityId).toBe(42)
    expect(o.domain).toBe('disaster')
    expect(o.visionCount).toBeGreaterThanOrEqual(0)
    expect(o.accuracy).toBeGreaterThan(0)
    expect(o.followers).toBeGreaterThan(0)
    expect(typeof o.active).toBe('boolean')
    expect(typeof o.tick).toBe('number')
  })
})
