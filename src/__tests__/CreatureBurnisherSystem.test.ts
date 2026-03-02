import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBurnisherSystem } from '../systems/CreatureBurnisherSystem'
import type { Burnisher } from '../systems/CreatureBurnisherSystem'

let nextId = 1
function makeSys(): CreatureBurnisherSystem { return new CreatureBurnisherSystem() }
function makeBurnisher(entityId: number, burnishingSkill: number = 30, pressureTechnique: number = 25, surfaceSmoothness: number = 20, reflectiveFinish: number = 35, tickVal: number = 0): Burnisher {
  return { id: nextId++, entityId, burnishingSkill, pressureTechnique, surfaceSmoothness, reflectiveFinish, tick: tickVal }
}

const EMPTY_EM = {} as any

describe('CreatureBurnisherSystem', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无抛光师记录', () => {
    expect((sys as any).burnishers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询entityId', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个抛光师全部返回', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    ;(sys as any).burnishers.push(makeBurnisher(2))
    ;(sys as any).burnishers.push(makeBurnisher(3))
    expect((sys as any).burnishers).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const b = makeBurnisher(10, 80, 75, 70, 65)
    ;(sys as any).burnishers.push(b)
    const r = (sys as any).burnishers[0]
    expect(r.burnishingSkill).toBe(80)
    expect(r.pressureTechnique).toBe(75)
    expect(r.surfaceSmoothness).toBe(70)
    expect(r.reflectiveFinish).toBe(65)
  })

  // 5. tick差值<2870时不更新lastCheck
  it('tick差值<2870时lastCheck不变', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000) // diff=2000 < 2870
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=2870时更新lastCheck
  it('tick差值>=2870时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).lastCheck).toBe(2870)
  })

  // 7. update后burnishingSkill+0.02
  it('update后burnishingSkill增加0.02', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  // 8. update后pressureTechnique+0.015
  it('update后pressureTechnique增加0.015', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 40))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBeCloseTo(40.015, 5)
  })

  // 9. burnishingSkill上限为100（99.99+0.02=100.01 → clamp→100）
  it('burnishingSkill上限为100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(100)
  })

  // 10. cleanup: burnishingSkill<=4时删除（3.98+0.02=4.00<=4，删除）
  it('cleanup：burnishingSkill=3.98更新后恰好=4.00被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98)) // 3.98+0.02=4.00 <=4 → deleted
    ;(sys as any).burnishers.push(makeBurnisher(2, 50))   // 50+0.02=50.02 > 4 → kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    const remaining = (sys as any).burnishers as Burnisher[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  // 额外测试：burnishingSkill=4.01时不被cleanup删除
  it('burnishingSkill=4.01更新后=4.03不被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 4.01))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(1)
  })

  // 额外测试：update后reflectiveFinish+0.01
  it('update后reflectiveFinish增加0.01', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 60))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBeCloseTo(60.01, 5)
  })

  // 额外测试：surfaceSmoothness不受update影响（按源码不更新）
  it('surfaceSmoothness在update后保持不变', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 55, 35))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].surfaceSmoothness).toBe(55)
  })

  // 额外测试：pressureTechnique上限100
  it('pressureTechnique上限为100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBe(100)
  })

  // 额外测试：reflectiveFinish上限100
  it('reflectiveFinish上限为100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBe(100)
  })

  // 额外测试：cleanup严格<=4（burnishingSkill=4.00被删除）
  it('cleanup严格<=4：burnishingSkill起始=4.00直接<=4被删除（先递增再cleanup）', () => {
    // 起始3.98 → +0.02 = 4.00 <=4 → deleted（边界值）
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  // 额外测试：返回内部数组引用一致
  it('同一实例返回同一内部数组引用', () => {
    const arr = (sys as any).burnishers
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers).toBe(arr)
  })
})
