import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGrinderSystem } from '../systems/CreatureGrinderSystem'
import type { Grinder } from '../systems/CreatureGrinderSystem'

let nextId = 1
function makeSys(): CreatureGrinderSystem { return new CreatureGrinderSystem() }
function makeGrinder(entityId: number): Grinder {
  return { id: nextId++, entityId, grindingSkill: 50, wheelControl: 60, surfaceFinish: 70, sparkManagement: 80, tick: 0 }
}

describe('CreatureGrinderSystem.getGrinders', () => {
  let sys: CreatureGrinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无磨工', () => { expect(sys.getGrinders()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).grinders.push(makeGrinder(1))
    expect(sys.getGrinders()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).grinders.push(makeGrinder(1))
    expect(sys.getGrinders()).toBe((sys as any).grinders)
  })
  it('多个全部返回', () => {
    ;(sys as any).grinders.push(makeGrinder(1))
    ;(sys as any).grinders.push(makeGrinder(2))
    expect(sys.getGrinders()).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const g = makeGrinder(10)
    g.grindingSkill = 90; g.wheelControl = 85; g.surfaceFinish = 80; g.sparkManagement = 75
    ;(sys as any).grinders.push(g)
    const r = sys.getGrinders()[0]
    expect(r.grindingSkill).toBe(90); expect(r.wheelControl).toBe(85)
    expect(r.surfaceFinish).toBe(80); expect(r.sparkManagement).toBe(75)
  })
})
