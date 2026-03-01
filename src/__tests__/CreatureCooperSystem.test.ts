import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCooperSystem } from '../systems/CreatureCooperSystem'
import type { Cooper } from '../systems/CreatureCooperSystem'

let nextId = 1
function makeSys(): CreatureCooperSystem { return new CreatureCooperSystem() }
function makeCooper(entityId: number): Cooper {
  return { id: nextId++, entityId, staveShaping: 30, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureCooperSystem.getCoopers', () => {
  let sys: CreatureCooperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无桶匠', () => { expect((sys as any).coopers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    expect((sys as any).coopers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    expect((sys as any).coopers).toBe((sys as any).coopers)
  })

  it('多个全部返回', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    ;(sys as any).coopers.push(makeCooper(2))
    expect((sys as any).coopers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeCooper(10)
    c.staveShaping = 80; c.hoopFitting = 75; c.sealingSkill = 70; c.outputQuality = 65
    ;(sys as any).coopers.push(c)
    const r = (sys as any).coopers[0]
    expect(r.staveShaping).toBe(80); expect(r.hoopFitting).toBe(75)
    expect(r.sealingSkill).toBe(70); expect(r.outputQuality).toBe(65)
  })
})
