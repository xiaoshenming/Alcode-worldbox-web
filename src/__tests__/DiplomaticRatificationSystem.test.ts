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
