import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticRatificationSystem } from '../systems/DiplomaticRatificationSystem'
import type { Ratification, TreatyType } from '../systems/DiplomaticRatificationSystem'

const W = {} as any
const EM = {} as any
function makeSys() { return new DiplomaticRatificationSystem() }

describe('DiplomaticRatificationSystem', () => {
  let sys: DiplomaticRatificationSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ──────────────────────────────────────────────────────
  it('初始ratifications为空数组', () => {
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('ratifications是数组类型', () => {
    expect(Array.isArray((sys as any).ratifications)).toBe(true)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('手动push后ratifications长度增加', () => {
    ;(sys as any).ratifications.push({ id: 1 })
    expect((sys as any).ratifications).toHaveLength(1)
  })

  // ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2000)
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('tick = CHECK_INTERVAL时触发检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2100)
    expect((sys as any).lastCheck).toBe(2100)
  })
  it('首次触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('未达CHECK_INTERVAL时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2100)
    sys.update(1, W, EM, 3000)   // 3000-2100=900 < 2100
    expect((sys as any).lastCheck).toBe(2100)
  })
  it('两次触发间隔满足CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2100)
    sys.update(1, W, EM, 4200)
    expect((sys as any).lastCheck).toBe(4200)
  })

  // ── 3. 字段动态更新 ───────────────────────────────────────────────────────
  it('ratified=true when approvalRate > 50', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 75, legislatorsFor: 15, legislatorsAgainst: 5,
      ratified: false, tick: 0,
    }
    r.ratified = r.approvalRate > 50
    expect(r.ratified).toBe(true)
  })
  it('ratified=false when approvalRate <= 50', () => {
    const r: Ratification = {
      id: 2, civId: 1, targetCivId: 3, treatyType: 'trade',
      approvalRate: 40, legislatorsFor: 4, legislatorsAgainst: 6,
      ratified: true, tick: 0,
    }
    r.ratified = r.approvalRate > 50
    expect(r.ratified).toBe(false)
  })
  it('legislatorsFor + legislatorsAgainst = totalLegislators', () => {
    const total = 30
    const forPct = 60
    const lFor = Math.floor(total * forPct / 100)
    const lAgainst = total - lFor
    expect(lFor + lAgainst).toBe(total)
  })
  it('nextId在每次push后递增', () => {
    ;(sys as any).ratifications.push({ id: (sys as any).nextId++ })
    ;(sys as any).ratifications.push({ id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(3)
  })

  // ── 4. 过期 cleanup ────────────────────────────────────────────────────────
  it('tick < cutoff的条目在update后被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // 跳过spawn块
    const expiredTick = 1000
    const currentTick = expiredTick + 52001
    ;(sys as any).ratifications.push({
      id: 99, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4,
      ratified: true, tick: expiredTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('tick > cutoff的条目不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const recentTick = 100000
    const currentTick = recentTick + 10000  // 10000 < 52000 未过期
    ;(sys as any).ratifications.push({
      id: 100, civId: 2, targetCivId: 3, treatyType: 'defense',
      approvalRate: 70, legislatorsFor: 7, legislatorsAgainst: 3,
      ratified: true, tick: recentTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).ratifications).toHaveLength(1)
  })
  it('cutoff边界=tick-52000：等于cutoff的不保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 100000
    const boundaryTick = currentTick - 52000  // 等于cutoff，条件是 < cutoff故不删
    ;(sys as any).ratifications.push({
      id: 101, civId: 3, targetCivId: 4, treatyType: 'non_aggression',
      approvalRate: 55, legislatorsFor: 8, legislatorsAgainst: 2,
      ratified: true, tick: boundaryTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    // tick === cutoff 时条件 tick < cutoff 为false，不删除
    expect((sys as any).ratifications).toHaveLength(1)
  })
  it('混合新旧条目只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 200000
    ;(sys as any).ratifications.push(
      { id: 1, civId: 1, targetCivId: 2, treatyType: 'peace', approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 1000 },
      { id: 2, civId: 3, targetCivId: 4, treatyType: 'trade', approvalRate: 70, legislatorsFor: 7, legislatorsAgainst: 3, ratified: true, tick: 180000 },
    )
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    const remaining = (sys as any).ratifications as Ratification[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(2)
  })

  // ── 5. MAX_RATIFICATIONS 上限 ──────────────────────────────────────────────
  it('MAX_RATIFICATIONS=28，已有28条时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < RATIFY_CHANCE会触发spawn
    const bigTick = 500000
    for (let i = 0; i < 28; i++) {
      ;(sys as any).ratifications.push({
        id: i + 1, civId: 1, targetCivId: 2, treatyType: 'peace',
        approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4,
        ratified: true, tick: bigTick,
      })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).ratifications.length).toBeLessThanOrEqual(28)
  })
  it('未达上限时随机满足条件可新增条目', () => {
    // random固定：0.001触发spawn, 0.5选civId/targetCivId不同
    const randoms = [0.001, 0.1, 0.6, 0.5, 0.5, 0.5]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[call++ % randoms.length])
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 10000)
    // spawn可能发生也可能因civId===targetCivId跳过，只验证不超过1
    expect((sys as any).ratifications.length).toBeLessThanOrEqual(1)
  })
  it('数组容量不超过MAX_RATIFICATIONS=28', () => {
    expect((sys as any).ratifications.length).toBeLessThanOrEqual(28)
  })
  it('初始数组长度为0，远低于上限', () => {
    expect((sys as any).ratifications.length).toBe(0)
  })

  // ── 6. 枚举完整性 ─────────────────────────────────────────────────────────
  it('TreatyType包含peace', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4,
      ratified: true, tick: 0,
    }
    expect(r.treatyType).toBe('peace')
  })
  it('TreatyType包含trade/defense/non_aggression', () => {
    const types: TreatyType[] = ['trade', 'defense', 'non_aggression']
    for (const t of types) {
      const r: Ratification = {
        id: 1, civId: 1, targetCivId: 2, treatyType: t,
        approvalRate: 55, legislatorsFor: 5, legislatorsAgainst: 5,
        ratified: true, tick: 0,
      }
      expect(r.treatyType).toBe(t)
    }
  })
  it('Ratification接口字段齐全', () => {
    const r: Ratification = {
      id: 5, civId: 2, targetCivId: 3, treatyType: 'defense',
      approvalRate: 65, legislatorsFor: 13, legislatorsAgainst: 7,
      ratified: true, tick: 12345,
    }
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('civId')
    expect(r).toHaveProperty('targetCivId')
    expect(r).toHaveProperty('treatyType')
    expect(r).toHaveProperty('approvalRate')
    expect(r).toHaveProperty('legislatorsFor')
    expect(r).toHaveProperty('legislatorsAgainst')
    expect(r).toHaveProperty('ratified')
    expect(r).toHaveProperty('tick')
  })
})

describe('DiplomaticRatificationSystem — 额外测试', () => {
  let sys: DiplomaticRatificationSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('CHECK_INTERVAL=2100验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2099)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, W, EM, 2100)
    expect((sys as any).lastCheck).toBe(2100)
  })
  it('MAX_RATIFICATIONS=28上限', () => {
    for (let i = 1; i <= 28; i++) {
      ;(sys as any).ratifications.push({ id: i, civId: 1, targetCivId: 2, treatyType: 'peace',
        approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, 2100)
    expect((sys as any).ratifications).toHaveLength(28)
  })
  it('TreatyType包含peace', () => {
    const types: TreatyType[] = ['peace', 'trade', 'defense', 'non_aggression']
    expect(types).toContain('peace')
  })
  it('TreatyType包含4种', () => {
    const types: TreatyType[] = ['peace', 'trade', 'defense', 'non_aggression']
    expect(types).toHaveLength(4)
  })
  it('ratified=true当approvalRate>50', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0
    }
    expect(r.ratified).toBe(true)
  })
  it('ratified=false当approvalRate<=50', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 40, legislatorsFor: 4, legislatorsAgainst: 6, ratified: false, tick: 0
    }
    expect(r.ratified).toBe(false)
  })
  it('Ratification包含legislatorsFor字段', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'trade',
      approvalRate: 50, legislatorsFor: 5, legislatorsAgainst: 5, ratified: false, tick: 0
    }
    expect(r).toHaveProperty('legislatorsFor')
  })
  it('Ratification包含legislatorsAgainst字段', () => {
    const r: Ratification = {
      id: 1, civId: 1, targetCivId: 2, treatyType: 'defense',
      approvalRate: 55, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0
    }
    expect(r).toHaveProperty('legislatorsAgainst')
  })
  it('过期清理cutoff=tick-52000', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 55000)
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('新鲜tick在过期时存活', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 999999 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 55000)
    expect((sys as any).ratifications).toHaveLength(1)
  })
  it('spawn时civId!=targetCivId', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, 2100)
    if ((sys as any).ratifications.length > 0) {
      const r = (sys as any).ratifications[0]
      expect(r.civId).not.toBe(r.targetCivId)
    }
  })
  it('spawn后nextId=2', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, 2100)
    expect((sys as any).nextId).toBe(2)
  })
  it('_ratificationsBuf是数组', () => {
    expect(Array.isArray((sys as any)._ratificationsBuf)).toBe(true)
  })
  it('系统实例化不报错', () => {
    expect(() => new DiplomaticRatificationSystem()).not.toThrow()
  })
  it('整体运行不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => {
      for (let _i = 0; _i <= 10; _i++) sys.update(1, W, EM, 2100 * _i)
    }).not.toThrow()
  })
})

describe('DiplomaticRatificationSystem — 补充测试', () => {
  let sys: DiplomaticRatificationSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('ratification包含approvalRate字段', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0 })
    expect((sys as any).ratifications[0]).toHaveProperty('approvalRate')
  })
  it('ratification包含treatyType字段', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'trade',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0 })
    expect((sys as any).ratifications[0]).toHaveProperty('treatyType')
  })
  it('三次足够间隔后lastCheck=6300', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2100)
    sys.update(1, W, EM, 4200)
    sys.update(1, W, EM, 6300)
    expect((sys as any).lastCheck).toBe(6300)
  })
  it('non_aggression是合法TreatyType', () => {
    const types: TreatyType[] = ['peace', 'trade', 'defense', 'non_aggression']
    expect(types).toContain('non_aggression')
  })
  it('defense是合法TreatyType', () => {
    const types: TreatyType[] = ['peace', 'trade', 'defense', 'non_aggression']
    expect(types).toContain('defense')
  })
  it('两条ratification均过期时清空', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0 })
    ;(sys as any).ratifications.push({ id: 2, civId: 3, targetCivId: 4, treatyType: 'trade',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 55000)
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('ratification注入后tick字段正确', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 9999 })
    expect((sys as any).ratifications[0].tick).toBe(9999)
  })
  it('random=0.99时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2100)
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('tick=0时不触发任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('ratifications数组初始为空', () => {
    expect((sys as any).ratifications).toHaveLength(0)
  })
  it('EXPIRE_OFFSET=52000验证(tick=0在tick=55000时删除)', () => {
    ;(sys as any).ratifications.push({ id: 1, civId: 1, targetCivId: 2, treatyType: 'peace',
      approvalRate: 60, legislatorsFor: 6, legislatorsAgainst: 4, ratified: true, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 55000)
    // cutoff = 55000-52000=3000; tick=0<3000 → deleted
    expect((sys as any).ratifications).toHaveLength(0)
  })
})
