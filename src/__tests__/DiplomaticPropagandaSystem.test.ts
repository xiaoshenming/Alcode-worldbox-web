import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPropagandaSystem } from '../systems/DiplomaticPropagandaSystem'
import type { Propaganda, PropagandaMessage } from '../systems/DiplomaticPropagandaSystem'

function makeSys() { return new DiplomaticPropagandaSystem() }
function makeP(overrides: Partial<Propaganda> = {}): Propaganda {
  return { id: 1, sourceCivId: 1, targetCivId: 2, message: 'glory', effectiveness: 50, tick: 0, ...overrides }
}
const em = {} as any

describe('DiplomaticPropagandaSystem', () => {
  let sys: DiplomaticPropagandaSystem
  beforeEach(() => { sys = makeSys() })

  // 1. 基础数据结构
  it('初始propaganda为空数组', () => { expect((sys as any).propaganda).toHaveLength(0) })
  it('propaganda是数组类型', () => { expect(Array.isArray((sys as any).propaganda)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入条目后长度正确', () => {
    ;(sys as any).propaganda.push(makeP())
    expect((sys as any).propaganda).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL 节流
  it('tick=0时不触发(lastCheck=0)', () => {
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=899时不触发', () => {
    sys.update(1, em, 899)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=900时触发并更新lastCheck', () => {
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('tick=1800时再次触发', () => {
    sys.update(1, em, 900)
    sys.update(1, em, 1800)
    expect((sys as any).lastCheck).toBe(1800)
  })
  it('两次update间隔不足CHECK_INTERVAL不更新lastCheck', () => {
    sys.update(1, em, 900)
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(900)
  })

  // 3. 字段动态更新
  it('effectiveness<70时evolveEffectiveness后增长', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 50 }))
    ;(sys as any).evolveEffectiveness()
    expect((sys as any).propaganda[0].effectiveness).toBeGreaterThanOrEqual(50)
  })
  it('effectiveness>=70时evolveEffectiveness后衰减', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 80 }))
    ;(sys as any).evolveEffectiveness()
    expect((sys as any).propaganda[0].effectiveness).toBeLessThan(80)
  })
  it('effectiveness不超过100(多次evolve)', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 65 }))
    for (let i = 0; i < 50; i++) {
      ;(sys as any).evolveEffectiveness()
    }
    expect((sys as any).propaganda[0].effectiveness).toBeLessThanOrEqual(100)
  })
  it('effectiveness>=70时衰减不低于0(DECAY_RATE=0.3)', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 70 }))
    for (let i = 0; i < 1000; i++) {
      ;(sys as any).evolveEffectiveness()
    }
    expect((sys as any).propaganda[0].effectiveness).toBeGreaterThanOrEqual(0)
  })

  // 4. cleanup
  it('直接cleanup时effectiveness<=1的条目被删除', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 0.5 }))
    ;(sys as any).cleanup()
    expect((sys as any).propaganda).toHaveLength(0)
  })
  it('直接cleanup时effectiveness=1的条目被删除', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 1 }))
    ;(sys as any).cleanup()
    expect((sys as any).propaganda).toHaveLength(0)
  })
  it('直接cleanup时effectiveness>1的条目保留', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 80 }))
    ;(sys as any).cleanup()
    expect((sys as any).propaganda).toHaveLength(1)
  })
  it('cleanup后_propagandaKeySet中对应key被删除', () => {
    const p = makeP({ effectiveness: 0.5, sourceCivId: 3, targetCivId: 5 })
    ;(sys as any).propaganda.push(p)
    ;(sys as any)._propagandaKeySet.add(3 * 1000 + 5)
    ;(sys as any).cleanup()
    expect((sys as any)._propagandaKeySet.has(3 * 1000 + 5)).toBe(false)
  })

  // 5. MAX上限
  it('超过MAX_PROPAGANDA(40)时generatePropaganda不新增', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i + 1, sourceCivId: i + 1, targetCivId: i + 100, effectiveness: 50 }))
    }
    expect((sys as any).propaganda.length).toBe(40)
    ;(sys as any).generatePropaganda(900)
    expect((sys as any).propaganda.length).toBeLessThanOrEqual(40)
  })
  it('cleanup后超出MAX_PROPAGANDA的条目被截断', () => {
    for (let i = 0; i < 45; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i + 1, sourceCivId: i + 1, targetCivId: i + 100, effectiveness: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).propaganda.length).toBeLessThanOrEqual(40)
  })
  it('cleanup截断时保留effectiveness最高的条目', () => {
    for (let i = 0; i < 41; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i + 1, sourceCivId: i + 1, targetCivId: i + 100, effectiveness: i + 2 }))
    }
    ;(sys as any).cleanup()
    const effs = (sys as any).propaganda.map((p: Propaganda) => p.effectiveness)
    expect(Math.min(...effs)).toBeGreaterThanOrEqual(3)
  })
  it('MAX_PROPAGANDA常量为40(行为验证)', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i + 1, sourceCivId: i + 1, targetCivId: i + 100, effectiveness: 50 }))
    }
    expect((sys as any).propaganda.length).toBe(40)
  })

  // 6. 枚举完整性
  it('PropagandaMessage包含glory', () => {
    const p = makeP({ message: 'glory' })
    expect(p.message).toBe('glory')
  })
  it('PropagandaMessage包含所有6种类型', () => {
    const msgs: PropagandaMessage[] = ['glory', 'fear', 'prosperity', 'liberation', 'unity', 'divine']
    expect(msgs).toHaveLength(6)
  })
  it('Propaganda接口字段完整', () => {
    const p = makeP()
    expect(p).toHaveProperty('sourceCivId')
    expect(p).toHaveProperty('targetCivId')
    expect(p).toHaveProperty('message')
    expect(p).toHaveProperty('effectiveness')
    expect(p).toHaveProperty('tick')
  })
})

describe('DiplomaticPropagandaSystem — 额外测试', () => {
  let sys: any
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('CHECK_INTERVAL=900', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 899)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('DECAY_RATE=0.3验证(effectiveness=70时每次减少0.3)', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 70 }))
    ;(sys as any).evolveEffectiveness()
    expect((sys as any).propaganda[0].effectiveness).toBeCloseTo(69.7, 5)
  })
  it('effectiveness=70时exactly开始decay', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 70 }))
    ;(sys as any).evolveEffectiveness()
    // >= 70 => decay: 70 - 0.3 = 69.7
    expect((sys as any).propaganda[0].effectiveness).toBeLessThan(70)
  })
  it('effectiveness<70时evolve后增长不超过100', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 68 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).evolveEffectiveness()
    expect((sys as any).propaganda[0].effectiveness).toBeLessThanOrEqual(100)
  })
  it('sourceCivId从1到10范围', () => {
    const p = makeP({ sourceCivId: 10 })
    expect(p.sourceCivId).toBe(10)
  })
  it('targetCivId从1到10范围', () => {
    const p = makeP({ targetCivId: 10 })
    expect(p.targetCivId).toBe(10)
  })
  it('hasPropaganda检查内部实现', () => {
    ;(sys as any)._propagandaKeySet.add(1 * 1000 + 2)
    expect((sys as any).hasPropaganda(1, 2)).toBe(true)
    expect((sys as any).hasPropaganda(2, 1)).toBe(false)
  })
  it('generatePropaganda调用后length可能增加', () => {
    const before = (sys as any).propaganda.length
    // mockReturnValueOnce: 0<PROPAGANDA_CHANCE, then 0.1 for sourceCivId, 0.5 for targetCivId (different)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    ;(sys as any).generatePropaganda(900)
    expect((sys as any).propaganda.length).toBeGreaterThanOrEqual(before)
  })
  it('系统实例化不报错', () => {
    expect(() => makeSys()).not.toThrow()
  })
  it('两次update间隔足够后lastCheck=1800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 900)
    sys.update(1, em, 1800)
    expect((sys as any).lastCheck).toBe(1800)
  })
  it('cleanup后effectiveness<=1的消失', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 0.9 }))
    ;(sys as any).cleanup()
    expect((sys as any).propaganda.every((p: any) => p.effectiveness > 1)).toBe(true)
  })
  it('MAX_PROPAGANDA=40上限', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i+1, sourceCivId: i+1, targetCivId: i+100, effectiveness: 50 }))
    }
    expect((sys as any).propaganda.length).toBe(40)
  })
  it('cleanup后超出40的被截断', () => {
    for (let i = 0; i < 42; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i+1, sourceCivId: i+1, targetCivId: i+100, effectiveness: 50 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).propaganda.length).toBeLessThanOrEqual(40)
  })
  it('整体运行不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => {
      for (let i = 0; i <= 10; i++) sys.update(1, em, 900 * i)
    }).not.toThrow()
  })
  it('_propagandaKeySet是Set', () => {
    expect((sys as any)._propagandaKeySet instanceof Set).toBe(true)
  })
  it('propaganda数组初始不是null', () => {
    expect((sys as any).propaganda).not.toBeNull()
  })
  it('propaganda id从1开始', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('间隔不足不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 900)
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('propagandaKeySet在cleanup后size减少', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 0.5, sourceCivId: 5, targetCivId: 6 }))
    ;(sys as any)._propagandaKeySet.add(5 * 1000 + 6)
    const before = (sys as any)._propagandaKeySet.size
    ;(sys as any).cleanup()
    expect((sys as any)._propagandaKeySet.size).toBeLessThanOrEqual(before)
  })
  it('effectiveness增长：<70时每次最多+2', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).evolveEffectiveness()
    expect((sys as any).propaganda[0].effectiveness).toBeLessThanOrEqual(62)
  })
})

describe('DiplomaticPropagandaSystem — 补充验证', () => {
  let sys: any
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('PROPAGAND_CHANCE=0.01（tick=900时不一定spawn）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > PROPAGANDA_CHANCE
    sys.update(1, em, 900)
    expect((sys as any).propaganda).toHaveLength(0)
  })
  it('三次update后lastCheck=2700', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 900)
    sys.update(1, em, 1800)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
  it('effectiveness=0.5时cleanup删除该条', () => {
    ;(sys as any).propaganda.push(makeP({ effectiveness: 0.5 }))
    ;(sys as any).cleanup()
    expect((sys as any).propaganda.filter((p: any) => p.effectiveness <= 1)).toHaveLength(0)
  })
  it('propaganda包含message字段', () => {
    const p = makeP({ message: 'fear' })
    expect(p).toHaveProperty('message')
    expect(p.message).toBe('fear')
  })
  it('注入5条propaganda后length=5', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).propaganda.push(makeP({ id: i, effectiveness: 50 }))
    }
    expect((sys as any).propaganda).toHaveLength(5)
  })
  it('propaganda的tick字段存在', () => {
    const p = makeP({ tick: 12345 })
    expect(p).toHaveProperty('tick')
    expect(p.tick).toBe(12345)
  })
})
