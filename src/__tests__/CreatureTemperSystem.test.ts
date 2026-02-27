import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTemperSystem } from '../systems/CreatureTemperSystem'
import type { Temper } from '../systems/CreatureTemperSystem'

let nextId = 1
function makeSys(): CreatureTemperSystem { return new CreatureTemperSystem() }
function makeTemper(entityId: number): Temper {
  return { id: nextId++, entityId, temperingSkill: 70, heatControl: 65, hardnessJudgment: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureTemperSystem.getTempers', () => {
  let sys: CreatureTemperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无淬火工', () => { expect(sys.getTempers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tempers.push(makeTemper(1))
    expect(sys.getTempers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tempers.push(makeTemper(1))
    expect(sys.getTempers()).toBe((sys as any).tempers)
  })
  it('字段正确', () => {
    ;(sys as any).tempers.push(makeTemper(2))
    const t = sys.getTempers()[0]
    expect(t.temperingSkill).toBe(70)
    expect(t.hardnessJudgment).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).tempers.push(makeTemper(1))
    ;(sys as any).tempers.push(makeTemper(2))
    expect(sys.getTempers()).toHaveLength(2)
  })
})
