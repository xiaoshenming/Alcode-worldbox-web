import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBorerSystem } from '../systems/CreatureBorerSystem'
import type { Borer } from '../systems/CreatureBorerSystem'

let nextId = 1
function makeSys(): CreatureBorerSystem { return new CreatureBorerSystem() }
function makeBorer(entityId: number): Borer {
  return { id: nextId++, entityId, boringSkill: 30, cuttingDepth: 25, holeConcentricity: 20, toolAlignment: 35, tick: 0 }
}

describe('CreatureBorerSystem.getBorers', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镗孔师', () => { expect(sys.getBorers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect(sys.getBorers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect(sys.getBorers()).toBe((sys as any).borers)
  })

  it('多个全部返回', () => {
    ;(sys as any).borers.push(makeBorer(1))
    ;(sys as any).borers.push(makeBorer(2))
    expect(sys.getBorers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBorer(10)
    b.boringSkill = 80; b.cuttingDepth = 75; b.holeConcentricity = 70; b.toolAlignment = 65
    ;(sys as any).borers.push(b)
    const r = sys.getBorers()[0]
    expect(r.boringSkill).toBe(80)
    expect(r.cuttingDepth).toBe(75)
    expect(r.holeConcentricity).toBe(70)
    expect(r.toolAlignment).toBe(65)
  })
})
