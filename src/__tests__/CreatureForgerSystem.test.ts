import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureForgerSystem } from '../systems/CreatureForgerSystem'
import type { Forger } from '../systems/CreatureForgerSystem'

let nextId = 1
function makeSys(): CreatureForgerSystem { return new CreatureForgerSystem() }
function makeForger(entityId: number): Forger {
  return { id: nextId++, entityId, forgingSkill: 50, hammerControl: 60, metalReading: 70, structuralIntegrity: 80, tick: 0 }
}

describe('CreatureForgerSystem.getForgers', () => {
  let sys: CreatureForgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锻造师', () => { expect(sys.getForgers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).forgers.push(makeForger(1))
    expect(sys.getForgers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).forgers.push(makeForger(1))
    expect(sys.getForgers()).toBe((sys as any).forgers)
  })

  it('多个全部返回', () => {
    ;(sys as any).forgers.push(makeForger(1))
    ;(sys as any).forgers.push(makeForger(2))
    expect(sys.getForgers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeForger(10)
    f.forgingSkill = 90; f.hammerControl = 85; f.metalReading = 80; f.structuralIntegrity = 75
    ;(sys as any).forgers.push(f)
    const r = sys.getForgers()[0]
    expect(r.forgingSkill).toBe(90); expect(r.hammerControl).toBe(85)
    expect(r.metalReading).toBe(80); expect(r.structuralIntegrity).toBe(75)
  })
})
