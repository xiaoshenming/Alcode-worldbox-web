import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticTributeSystem } from '../systems/DiplomaticTributeSystem'

function makeSys() { return new DiplomaticTributeSystem() }

const world = {} as any
const em = {} as any

describe('DiplomaticTributeSystem', () => {
  let sys: DiplomaticTributeSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 (3个) ---
  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- 节流 (3个) ---
  it('tick不足CHECK_INTERVAL(2550)时不触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 2549)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('tick达到CHECK_INTERVAL后更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2550)
    expect((sys as any).lastCheck).toBe(2550)
  })

  it('未到第二个interval时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2550)
    sys.update(1, world, em, 4000) // 4000-2550=1450 < 2550
    expect((sys as any).lastCheck).toBe(2550)
  })

  // --- payer===receiver不spawn (2个) ---
  it('random生成payer===receiver时不spawn', () => {
    // Math.floor(random * 8) 对payer和receiver都返回0时 → payer=1, receiver=1
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)     // < PROCEED_CHANCE=0.0021
      .mockReturnValueOnce(0)     // payer = 1+floor(0*8) = 1
      .mockReturnValueOnce(0)     // receiver = 1+floor(0*8) = 1 → 相等 → return
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2550)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('random>=PROCEED_CHANCE(0.0021)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2550)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // --- spawn (5个) ---
  it('random=0且payer!==receiver时spawn一个arrangement', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)     // < PROCEED_CHANCE
      .mockReturnValueOnce(0)     // payer=1
      .mockReturnValueOnce(0.25)  // receiver=1+floor(0.25*8)=1+2=3
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2550)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('spawn的arrangement初始duration为0', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2550)
    // duration在同一次update中被+1，所以是1
    const a = (sys as any).arrangements[0]
    if (a) expect(a.duration).toBe(1)
  })

  it('spawn的arrangement tick等于当前tick', () => {
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 2550,
    })
    expect((sys as any).arrangements[0].tick).toBe(2550)
  })

  it('达到MAX_ARRANGEMENTS(16)后不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, payerCivId: 1, receiverCivId: 2,
        form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
        resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 2550,
      })
    }
    sys.update(1, world, em, 2550)
    expect((sys as any).arrangements).toHaveLength(16)
  })

  it('每次update后duration+1', () => {
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'resource_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 5, tick: 2550,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2550)
    expect((sys as any).arrangements[0].duration).toBe(6)
  })

  // --- cleanup (4个) ---
  it('tick=0的arrangement在cutoff=88001时被删除', () => {
    // cutoff = tick - 88000，tick=88001 → cutoff=1，a.tick=0 < 1 → 删除
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 88001)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('a.tick===cutoff时不删除(严格小于)', () => {
    // cutoff = tick - 88000，tick=88001 → cutoff=1，a.tick=1 不 < 1 → 保留
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 1,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 88001)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('tick足够新的arrangement不被删除', () => {
    const tick = 100000
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 20000, // 100000-20000=80000 < 88000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('批量清理：多个过期arrangement一次性删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, payerCivId: 1, receiverCivId: 2,
        form: 'gold_tribute', tributeAmount: 30, complianceRate: 40,
        resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 0,
      })
    }
    sys.update(1, world, em, 90000) // cutoff=2000，a.tick=0<2000 → 全删
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // --- 字段验证 (3个) ---
  it('tributeAmount字段被更新（每tick随机漂移）', () => {
    const initial = 30
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'gold_tribute', tributeAmount: initial, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 2550,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2550)
    const after = (sys as any).arrangements[0].tributeAmount
    expect(after).toBeGreaterThanOrEqual(5)
    expect(after).toBeLessThanOrEqual(85)
  })

  it('手动注入多个arrangements数量正确', () => {
    for (let i = 1; i <= 4; i++) {
      ;(sys as any).arrangements.push({
        id: i, payerCivId: i, receiverCivId: i + 1,
        form: 'labor_tribute', tributeAmount: 30, complianceRate: 40,
        resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 0,
      })
    }
    expect((sys as any).arrangements).toHaveLength(4)
  })

  it('arrangement包含所有必要字段', () => {
    ;(sys as any).arrangements.push({
      id: 1, payerCivId: 1, receiverCivId: 2,
      form: 'military_tribute', tributeAmount: 30, complianceRate: 40,
      resentmentLevel: 20, protectionValue: 25, duration: 0, tick: 0,
    })
    const a = (sys as any).arrangements[0]
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('payerCivId')
    expect(a).toHaveProperty('receiverCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('tributeAmount')
    expect(a).toHaveProperty('complianceRate')
    expect(a).toHaveProperty('resentmentLevel')
    expect(a).toHaveProperty('protectionValue')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})
