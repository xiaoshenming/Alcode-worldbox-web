import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRollerSystem } from '../systems/CreatureRollerSystem'
import type { Roller } from '../systems/CreatureRollerSystem'

let nextId = 1
function makeSys(): CreatureRollerSystem { return new CreatureRollerSystem() }
function makeRoller(entityId: number): Roller {
  return { id: nextId++, entityId, rollingSkill: 70, pressureControl: 65, thicknessAccuracy: 80, surfaceFinish: 75, tick: 0 }
}

describe('CreatureRollerSystem.getRollers', () => {
  let sys: CreatureRollerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轧钢工', () => { expect(sys.getRollers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    expect(sys.getRollers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    expect(sys.getRollers()).toBe((sys as any).rollers)
  })
  it('字段正确', () => {
    ;(sys as any).rollers.push(makeRoller(2))
    const r = sys.getRollers()[0]
    expect(r.rollingSkill).toBe(70)
    expect(r.thicknessAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    ;(sys as any).rollers.push(makeRoller(2))
    expect(sys.getRollers()).toHaveLength(2)
  })
})
