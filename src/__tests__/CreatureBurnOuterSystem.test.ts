import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBurnOuterSystem } from '../systems/CreatureBurnOuterSystem'
import type { BurnOuter } from '../systems/CreatureBurnOuterSystem'

let nextId = 1
function makeSys(): CreatureBurnOuterSystem { return new CreatureBurnOuterSystem() }
function makeBurnOuter(entityId: number, burnOutSkill: number = 30, thermalControl: number = 25, cutPrecision: number = 20, materialRemoval: number = 35, tickVal: number = 0): BurnOuter {
  return { id: nextId++, entityId, burnOutSkill, thermalControl, cutPrecision, materialRemoval, tick: tickVal }
}

const EMPTY_EM = {} as any

describe('CreatureBurnOuterSystem', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无热切割师记录', () => {
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询entityId', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect((sys as any).burnOuters[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个热切割师全部返回', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    ;(sys as any).burnOuters.push(makeBurnOuter(2))
    ;(sys as any).burnOuters.push(makeBurnOuter(3))
    expect((sys as any).burnOuters).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const b = makeBurnOuter(10, 80, 75, 70, 65)
    ;(sys as any).burnOuters.push(b)
    const r = (sys as any).burnOuters[0]
    expect(r.burnOutSkill).toBe(80)
    expect(r.thermalControl).toBe(75)
    expect(r.cutPrecision).toBe(70)
    expect(r.materialRemoval).toBe(65)
  })

  // 5. tick差值<3080时不更新lastCheck
  it('tick差值<3080时lastCheck不变', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000) // diff=2000 < 3080
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=3080时更新lastCheck
  it('tick差值>=3080时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).lastCheck).toBe(3080)
  })

  // 7. update后burnOutSkill+0.02
  it('update后burnOutSkill增加0.02', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  // 8. update后thermalControl+0.015
  it('update后thermalControl增加0.015', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 40))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBeCloseTo(40.015, 5)
  })

  // 9. burnOutSkill上限为100（99.99+0.02=100.01 → clamp→100）
  it('burnOutSkill上限为100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(100)
  })

  // 10. cleanup: burnOutSkill=3.98边界删除
  it('cleanup：burnOutSkill=3.98更新后=4.00被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 3.98)) // 3.98+0.02=4.00 <=4 → deleted
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 50))   // 50.02 > 4 → kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    const remaining = (sys as any).burnOuters as BurnOuter[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  // 额外测试：burnOutSkill=4.01时不被cleanup删除
  it('burnOutSkill=4.01更新后=4.03不被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 4.01))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(1)
  })

  // 额外测试：update后materialRemoval+0.01
  it('update后materialRemoval增加0.01', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 60))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBeCloseTo(60.01, 5)
  })

  // 额外测试：cutPrecision在update后保持不变（源码不更新该字段）
  it('cutPrecision在update后保持不变', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 55, 35))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].cutPrecision).toBe(55)
  })

  // 额外测试：thermalControl上限100
  it('thermalControl上限为100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBe(100)
  })

  // 额外测试：materialRemoval上限100
  it('materialRemoval上限为100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBe(100)
  })

  // 额外测试：cleanup严格<=4（同边界）
  it('cleanup严格<=4：burnOutSkill=3.98+0.02=4.00被删除（边界验证）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  // 额外测试：返回内部数组引用一致
  it('同一实例返回同一内部数组引用', () => {
    const arr = (sys as any).burnOuters
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect((sys as any).burnOuters).toBe(arr)
  })
})
