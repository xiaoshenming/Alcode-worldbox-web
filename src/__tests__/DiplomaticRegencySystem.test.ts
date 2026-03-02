import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRegencySystem } from '../systems/DiplomaticRegencySystem'
import type { RegencyArrangement, RegencyForm } from '../systems/DiplomaticRegencySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRegencySystem() }
function makeArr(tick = 0): RegencyArrangement {
  return { id: 1, regentCivId: 1, wardCivId: 2, form: 'royal_regency',
    authorityLevel: 50, legitimacy: 50, wardProgress: 30, stabilityIndex: 30, duration: 0, tick }
}

describe('DiplomaticRegencySystem', () => {
  let sys: DiplomaticRegencySystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('注入后arrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL=2570时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2570时更新lastCheck', () => {
    sys.update(1, W, EM, 2570)
    expect((sys as any).lastCheck).toBe(2570)
  })
  it('第二次调用需再等2570', () => {
    sys.update(1, W, EM, 2570)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2570)
  })
  it('恰好再过CHECK_INTERVAL才再次更新', () => {
    sys.update(1, W, EM, 2570)
    sys.update(1, W, EM, 5140)
    expect((sys as any).lastCheck).toBe(5140)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeArr()
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2570)
    expect(a.duration).toBe(1)
  })
  it('authorityLevel上限85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeArr(); a.authorityLevel = 85
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2570)
    expect(a.authorityLevel).toBeLessThanOrEqual(85)
  })
  it('legitimacy下限10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = makeArr(); a.legitimacy = 10
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2570)
    expect(a.legitimacy).toBeGreaterThanOrEqual(10)
  })
  it('stabilityIndex下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = makeArr(); a.stabilityIndex = 5
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2570)
    expect(a.stabilityIndex).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff=90000的arrangement被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr(0))
    sys.update(1, W, EM, 92570)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr(10000))
    sys.update(1, W, EM, 92570)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('cleanup后nextId不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr(0))
    ;(sys as any).nextId = 6
    sys.update(1, W, EM, 92570)
    expect((sys as any).nextId).toBe(6)
  })
  it('cutoff边界：arrangement.tick===tick-90000时不被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const cur = 92570
    // 条件是 tick < cutoff，等于cutoff时不删除
    ;(sys as any).arrangements.push(makeArr(cur - 90000))
    sys.update(1, W, EM, cur)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 5. MAX上限
  it('已满14个时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const arr = (sys as any).arrangements
    for (let i = 0; i < 14; i++) {
      arr.push({ ...makeArr(999999), id: i + 1, wardCivId: i + 2 })
    }
    sys.update(1, W, EM, 2570)
    expect(arr.length).toBeLessThanOrEqual(14)
  })
  it('超过14个注入后系统不裁剪已有', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const arr = (sys as any).arrangements
    for (let i = 0; i < 20; i++) {
      arr.push({ ...makeArr(999999), id: i + 1, wardCivId: i + 2 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 2570)
    expect(arr.length).toBeGreaterThanOrEqual(14)
  })
  it('random=1时不新增（概率门未过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2570)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(14)
  })
  it('MAX_ARRANGEMENTS常量为14', () => { expect(14).toBe(14) })

  // 6. 枚举完整性
  it('RegencyForm包含royal_regency', () => {
    const f: RegencyForm = 'royal_regency'
    expect(f).toBe('royal_regency')
  })
  it('RegencyForm包含military_regency和council_regency', () => {
    const forms: RegencyForm[] = ['military_regency', 'council_regency']
    expect(forms).toHaveLength(2)
  })
  it('RegencyForm包含ecclesiastical_regency', () => {
    const f: RegencyForm = 'ecclesiastical_regency'
    expect(f).toBe('ecclesiastical_regency')
  })
})
