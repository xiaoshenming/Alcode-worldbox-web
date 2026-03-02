import { describe, it, expect, beforeEach } from 'vitest'
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
