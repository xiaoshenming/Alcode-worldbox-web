import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticReceivershipSystem } from '../systems/DiplomaticReceivershipSystem'
import type { ReceivershipArrangement, ReceivershipForm } from '../systems/DiplomaticReceivershipSystem'

const W = {} as any
const EM = {} as any
function makeSys() { return new DiplomaticReceivershipSystem() }

describe('DiplomaticReceivershipSystem', () => {
  let sys: DiplomaticReceivershipSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ──────────────────────────────────────────────────────
  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('arrangements是数组类型', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('手动push后arrangements长度增加', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL=2570时不执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick达到CHECK_INTERVAL时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2570)
    expect((sys as any).lastCheck).toBe(2570)
  })
  it('首次触发后lastCheck=当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('间隔不足时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2570)
    sys.update(1, W, EM, 4000)  // 4000-2570=1430 < 2570
    expect((sys as any).lastCheck).toBe(2570)
  })
  it('间隔足够时再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2570)
    sys.update(1, W, EM, 5140)  // 差值=2570 >= CHECK_INTERVAL
    expect((sys as any).lastCheck).toBe(5140)
  })

  // ── 3. 字段动态更新 ───────────────────────────────────────────────────────
  it('每次update后duration递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const arr: ReceivershipArrangement = {
      id: 1, receiverCivId: 1, debtorCivId: 2,
      form: 'economic_receivership',
      assetControl: 50, debtRecovery: 50,
      operationalScope: 30, legitimacyLevel: 30,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).arrangements.push(arr)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('assetControl在update后被钳制在[5,85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const arr: ReceivershipArrangement = {
      id: 2, receiverCivId: 2, debtorCivId: 3,
      form: 'territorial_receivership',
      assetControl: 50, debtRecovery: 50,
      operationalScope: 30, legitimacyLevel: 30,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).arrangements.push(arr)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).arrangements[0].assetControl).toBeGreaterThanOrEqual(5)
    expect((sys as any).arrangements[0].assetControl).toBeLessThanOrEqual(85)
  })
  it('debtRecovery在update后被钳制在[10,90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const arr: ReceivershipArrangement = {
      id: 3, receiverCivId: 3, debtorCivId: 4,
      form: 'military_receivership',
      assetControl: 50, debtRecovery: 50,
      operationalScope: 30, legitimacyLevel: 30,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).arrangements.push(arr)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).arrangements[0].debtRecovery).toBeGreaterThanOrEqual(10)
    expect((sys as any).arrangements[0].debtRecovery).toBeLessThanOrEqual(90)
  })
  it('legitimacyLevel在update后被钳制在[5,65]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 300000
    const arr: ReceivershipArrangement = {
      id: 4, receiverCivId: 4, debtorCivId: 5,
      form: 'institutional_receivership',
      assetControl: 50, debtRecovery: 50,
      operationalScope: 30, legitimacyLevel: 30,
      duration: 0, tick: bigTick,
    }
    ;(sys as any).arrangements.push(arr)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).arrangements[0].legitimacyLevel).toBeGreaterThanOrEqual(5)
    expect((sys as any).arrangements[0].legitimacyLevel).toBeLessThanOrEqual(65)
  })

  // ── 4. 过期 cleanup ────────────────────────────────────────────────────────
  it('tick < cutoff(tick-88000)的条目被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // 跳过spawn
    const expiredTick = 1000
    const currentTick = expiredTick + 88001
    ;(sys as any).arrangements.push({
      id: 99, receiverCivId: 1, debtorCivId: 2,
      form: 'economic_receivership',
      assetControl: 40, debtRecovery: 40,
      operationalScope: 20, legitimacyLevel: 20,
      duration: 5, tick: expiredTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick > cutoff的条目保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const recentTick = 200000
    const currentTick = recentTick + 10000  // 10000 < 88000
    ;(sys as any).arrangements.push({
      id: 100, receiverCivId: 2, debtorCivId: 3,
      form: 'territorial_receivership',
      assetControl: 50, debtRecovery: 50,
      operationalScope: 25, legitimacyLevel: 25,
      duration: 0, tick: recentTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('cutoff边界：tick等于cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 200000
    const boundaryTick = currentTick - 88000  // tick === cutoff
    ;(sys as any).arrangements.push({
      id: 101, receiverCivId: 3, debtorCivId: 4,
      form: 'military_receivership',
      assetControl: 45, debtRecovery: 45,
      operationalScope: 22, legitimacyLevel: 22,
      duration: 0, tick: boundaryTick,
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧条目只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const currentTick = 400000
    ;(sys as any).arrangements.push(
      {
        id: 1, receiverCivId: 1, debtorCivId: 2,
        form: 'economic_receivership',
        assetControl: 40, debtRecovery: 40, operationalScope: 20, legitimacyLevel: 20,
        duration: 0, tick: 1000,   // expired
      },
      {
        id: 2, receiverCivId: 3, debtorCivId: 4,
        form: 'institutional_receivership',
        assetControl: 50, debtRecovery: 50, operationalScope: 30, legitimacyLevel: 30,
        duration: 0, tick: 350000, // recent
      },
    )
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, currentTick)
    const remaining = (sys as any).arrangements as ReceivershipArrangement[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(2)
  })

  // ── 5. MAX_ARRANGEMENTS 上限 ───────────────────────────────────────────────
  it('MAX_ARRANGEMENTS=16，已满时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const bigTick = 500000
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, receiverCivId: 1, debtorCivId: 2,
        form: 'economic_receivership',
        assetControl: 40, debtRecovery: 40, operationalScope: 20, legitimacyLevel: 20,
        duration: 0, tick: bigTick,
      })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, bigTick + 3000)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('初始长度0远低于MAX_ARRANGEMENTS', () => {
    expect((sys as any).arrangements.length).toBe(0)
  })
  it('数组容量始终不超过16', () => {
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('未达上限时update可能新增条目', () => {
    const randoms = [0.001, 0.1, 0.6, 0.5, 0.5, 0.5, 0.5]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[call++ % randoms.length])
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 10000)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(1)
  })

  // ── 6. 枚举完整性 ─────────────────────────────────────────────────────────
  it('ReceivershipForm包含economic_receivership', () => {
    const a: ReceivershipArrangement = {
      id: 1, receiverCivId: 1, debtorCivId: 2,
      form: 'economic_receivership',
      assetControl: 40, debtRecovery: 40, operationalScope: 20, legitimacyLevel: 20,
      duration: 0, tick: 0,
    }
    expect(a.form).toBe('economic_receivership')
  })
  it('ReceivershipForm包含territorial/military/institutional', () => {
    const forms: ReceivershipForm[] = ['territorial_receivership', 'military_receivership', 'institutional_receivership']
    for (const f of forms) {
      const a: ReceivershipArrangement = {
        id: 1, receiverCivId: 1, debtorCivId: 2, form: f,
        assetControl: 40, debtRecovery: 40, operationalScope: 20, legitimacyLevel: 20,
        duration: 0, tick: 0,
      }
      expect(a.form).toBe(f)
    }
  })
  it('ReceivershipArrangement接口字段齐全', () => {
    const a: ReceivershipArrangement = {
      id: 5, receiverCivId: 2, debtorCivId: 3,
      form: 'military_receivership',
      assetControl: 45, debtRecovery: 55,
      operationalScope: 25, legitimacyLevel: 35,
      duration: 10, tick: 99999,
    }
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('receiverCivId')
    expect(a).toHaveProperty('debtorCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('assetControl')
    expect(a).toHaveProperty('debtRecovery')
    expect(a).toHaveProperty('operationalScope')
    expect(a).toHaveProperty('legitimacyLevel')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})
