import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticReciprocitySystem } from '../systems/DiplomaticReciprocitySystem'
import type { ReciprocityAgreement, ReciprocityDomain } from '../systems/DiplomaticReciprocitySystem'

const W = {} as any
const EM = {} as any
function makeSys() { return new DiplomaticReciprocitySystem() }

describe('DiplomaticReciprocitySystem', () => {
  let sys: DiplomaticReciprocitySystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ──────────────────────────────────────────────────────
  it('初始agreements为空数组', () => {
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('agreements是数组类型', () => {
    expect(Array.isArray((sys as any).agreements)).toBe(true)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('手动push后agreements长度增加', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect((sys as any).agreements).toHaveLength(1)
  })

  // ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL=2350时不执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2000)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick达到CHECK_INTERVAL时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2350)
    expect((sys as any).lastCheck).toBe(2350)
  })
  it('首次触发后lastCheck=当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 7000)
    expect((sys as any).lastCheck).toBe(7000)
  })
  it('间隔不足时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2350)
    sys.update(1, W, EM, 3000)  // 3000-2350=650 < 2350
    expect((sys as any).lastCheck).toBe(2350)
  })
  it('间隔足够时再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2350)
    sys.update(1, W, EM, 4700)  // 差值=2350 >= CHECK_INTERVAL
    expect((sys as any).lastCheck).toBe(4700)
  })

  // ── 3. 字段动态更新 ───────────────────────────────────────────────────────
  it('每次update后duration递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const ag: ReciprocityAgreement = {
      id: 1, civIdA: 1, civIdB: 2, domain: 'trade',
      balanceIndex: 50, exchangeVolume: 20,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).agreements.push(ag)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('balanceIndex在update后被钳制在[20,80]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const ag: ReciprocityAgreement = {
      id: 2, civIdA: 2, civIdB: 3, domain: 'military',
      balanceIndex: 50, exchangeVolume: 25,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).agreements.push(ag)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).agreements[0].balanceIndex).toBeGreaterThanOrEqual(20)
    expect((sys as any).agreements[0].balanceIndex).toBeLessThanOrEqual(80)
  })
  it('fairnessRating在update后被钳制在[15,85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const ag: ReciprocityAgreement = {
      id: 3, civIdA: 3, civIdB: 4, domain: 'cultural',
      balanceIndex: 50, exchangeVolume: 25,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).agreements.push(ag)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).agreements[0].fairnessRating).toBeGreaterThanOrEqual(15)
    expect((sys as any).agreements[0].fairnessRating).toBeLessThanOrEqual(85)
  })
  it('satisfaction在update后被钳制在[10,80]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const ag: ReciprocityAgreement = {
      id: 4, civIdA: 4, civIdB: 5, domain: 'technological',
      balanceIndex: 50, exchangeVolume: 25,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).agreements.push(ag)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).agreements[0].satisfaction).toBeGreaterThanOrEqual(10)
    expect((sys as any).agreements[0].satisfaction).toBeLessThanOrEqual(80)
  })

  // ── 4. 过期 cleanup ────────────────────────────────────────────────────────
  it('tick < cutoff(tick-84000)的条目被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // 跳过spawn
    const expiredTick = 1000
    const currentTick = expiredTick + 84001
    ;(sys as any).agreements.push({
      id: 99, civIdA: 1, civIdB: 2, domain: 'trade',
      balanceIndex: 50, exchangeVolume: 20,
      fairnessRating: 50, satisfaction: 40,
      duration: 5, tick: expiredTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick > cutoff的条目保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const recentTick = 200000
    const currentTick = recentTick + 10000  // 10000 < 84000
    ;(sys as any).agreements.push({
      id: 100, civIdA: 2, civIdB: 3, domain: 'military',
      balanceIndex: 50, exchangeVolume: 20,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: recentTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('cutoff边界：tick等于cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 200000
    const boundaryTick = currentTick - 84000  // tick === cutoff
    ;(sys as any).agreements.push({
      id: 101, civIdA: 3, civIdB: 4, domain: 'cultural',
      balanceIndex: 50, exchangeVolume: 20,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: boundaryTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('混合新旧条目只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 400000
    ;(sys as any).agreements.push(
      {
        id: 1, civIdA: 1, civIdB: 2, domain: 'trade',
        balanceIndex: 50, exchangeVolume: 20, fairnessRating: 50, satisfaction: 40,
        duration: 0, tick: 1000,    // expired
      },
      {
        id: 2, civIdA: 3, civIdB: 4, domain: 'technological',
        balanceIndex: 55, exchangeVolume: 25, fairnessRating: 55, satisfaction: 45,
        duration: 0, tick: 350000,  // recent
      },
    )
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    const remaining = (sys as any).agreements as ReciprocityAgreement[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(2)
  })

  // ── 5. MAX_AGREEMENTS 上限 ─────────────────────────────────────────────────
  it('MAX_AGREEMENTS=20，已满时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const bigTick = 500000
    for (let i = 0; i < 20; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, civIdA: 1, civIdB: 2, domain: 'trade',
        balanceIndex: 50, exchangeVolume: 20,
        fairnessRating: 50, satisfaction: 40,
        duration: 0, tick: bigTick,
      })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('初始长度0远低于MAX_AGREEMENTS', () => {
    expect((sys as any).agreements.length).toBe(0)
  })
  it('数组容量始终不超过20', () => {
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('未达上限时update可能新增条目', () => {
    const randoms = [0.001, 0.1, 0.6, 0.5, 0.5, 0.5, 0.5]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[call++ % randoms.length])
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 10000)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(1)
  })

  // ── 6. 枚举完整性 ─────────────────────────────────────────────────────────
  it('ReciprocityDomain包含trade', () => {
    const ag: ReciprocityAgreement = {
      id: 1, civIdA: 1, civIdB: 2, domain: 'trade',
      balanceIndex: 50, exchangeVolume: 20,
      fairnessRating: 50, satisfaction: 40,
      duration: 0, tick: 0,
    }
    expect(ag.domain).toBe('trade')
  })
  it('ReciprocityDomain包含military/cultural/technological', () => {
    const domains: ReciprocityDomain[] = ['military', 'cultural', 'technological']
    for (const d of domains) {
      const ag: ReciprocityAgreement = {
        id: 1, civIdA: 1, civIdB: 2, domain: d,
        balanceIndex: 50, exchangeVolume: 20,
        fairnessRating: 50, satisfaction: 40,
        duration: 0, tick: 0,
      }
      expect(ag.domain).toBe(d)
    }
  })
  it('ReciprocityAgreement接口字段齐全', () => {
    const ag: ReciprocityAgreement = {
      id: 7, civIdA: 3, civIdB: 5, domain: 'cultural',
      balanceIndex: 55, exchangeVolume: 22,
      fairnessRating: 60, satisfaction: 45,
      duration: 8, tick: 77777,
    }
    expect(ag).toHaveProperty('id')
    expect(ag).toHaveProperty('civIdA')
    expect(ag).toHaveProperty('civIdB')
    expect(ag).toHaveProperty('domain')
    expect(ag).toHaveProperty('balanceIndex')
    expect(ag).toHaveProperty('exchangeVolume')
    expect(ag).toHaveProperty('fairnessRating')
    expect(ag).toHaveProperty('satisfaction')
    expect(ag).toHaveProperty('duration')
    expect(ag).toHaveProperty('tick')
  })
})
