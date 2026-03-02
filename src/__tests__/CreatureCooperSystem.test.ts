import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCooperSystem } from '../systems/CreatureCooperSystem'
import type { Cooper } from '../systems/CreatureCooperSystem'

let nextId = 1
function makeSys(): CreatureCooperSystem { return new CreatureCooperSystem() }
function makeCooper(entityId: number, staveShaping = 30): Cooper {
  return { id: nextId++, entityId, staveShaping, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
}

const EM_EMPTY = {} as any

describe('CreatureCooperSystem', () => {
  let sys: CreatureCooperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无桶匠', () => {
    expect((sys as any).coopers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    expect((sys as any).coopers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    ;(sys as any).coopers.push(makeCooper(2))
    ;(sys as any).coopers.push(makeCooper(3))
    expect((sys as any).coopers).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const c = makeCooper(10)
    c.staveShaping = 80; c.hoopFitting = 75; c.sealingSkill = 70; c.outputQuality = 65
    ;(sys as any).coopers.push(c)
    const r = (sys as any).coopers[0]
    expect(r.staveShaping).toBe(80)
    expect(r.hoopFitting).toBe(75)
    expect(r.sealingSkill).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  // 5. tick差值<2590时不更新lastCheck
  it('tick差值<2590时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, EM_EMPTY, 1000 + 2589)
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=2590时更新lastCheck
  it('tick差值>=2590时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const tick = 1000 + 2590
    sys.update(1, EM_EMPTY, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })

  // 7. update后staveShaping+0.02
  it('update后staveShaping+0.02', () => {
    const c = makeCooper(1, 30)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.02)
  })

  // 8. update后sealingSkill+0.015
  it('update后sealingSkill+0.015', () => {
    const c = makeCooper(1, 30)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    expect((sys as any).coopers[0].sealingSkill).toBeCloseTo(20.015)
  })

  // 9. staveShaping上限100
  it('staveShaping上限100', () => {
    const c = makeCooper(1, 99.99)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    expect((sys as any).coopers[0].staveShaping).toBe(100)
  })

  // 10. cleanup: staveShaping<=4时删除（3.98→4.00后清除，entityId=2保留）
  it('cleanup: staveShaping=3.98先+0.02变4.00则删除，entityId=2保留', () => {
    const c1: Cooper = { id: nextId++, entityId: 1, staveShaping: 3.98, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
    const c2: Cooper = { id: nextId++, entityId: 2, staveShaping: 30, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
    ;(sys as any).coopers.push(c1, c2)
    sys.update(1, EM_EMPTY, 2590)
    const coopers = (sys as any).coopers as Cooper[]
    // c1 staveShaping: 3.98+0.02=4.00, <=4 → 删除
    expect(coopers.find((c: Cooper) => c.entityId === 1)).toBeUndefined()
    // c2 staveShaping: 30+0.02=30.02, >4 → 保留
    expect(coopers.find((c: Cooper) => c.entityId === 2)).toBeDefined()
  })

  // 11. outputQuality也递增+0.01
  it('update后outputQuality+0.01', () => {
    const c = makeCooper(1, 30)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    expect((sys as any).coopers[0].outputQuality).toBeCloseTo(35.01)
  })

  // 12. hoopFitting不变（未被update逻辑修改）
  it('hoopFitting不被update改变', () => {
    const c = makeCooper(1, 30)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    expect((sys as any).coopers[0].hoopFitting).toBe(25)
  })

  // 13. 多次update累积增长
  it('多次update后技能累积增长', () => {
    const c = makeCooper(1, 30)
    ;(sys as any).coopers.push(c)
    sys.update(1, EM_EMPTY, 2590)
    ;(sys as any).lastCheck = 0
    sys.update(1, EM_EMPTY, 5180)
    expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.04)
  })
})
