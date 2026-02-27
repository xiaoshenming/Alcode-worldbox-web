import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFlatterSystem } from '../systems/CreatureFlatterSystem'
import type { Flatter } from '../systems/CreatureFlatterSystem'

let nextId = 1
function makeSys(): CreatureFlatterSystem { return new CreatureFlatterSystem() }
function makeFlatter(entityId: number): Flatter {
  return { id: nextId++, entityId, flattingSkill: 50, rollingPressure: 60, sheetUniformity: 70, thicknessControl: 80, tick: 0 }
}

describe('CreatureFlatterSystem.getFlatters', () => {
  let sys: CreatureFlatterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无压平工', () => { expect(sys.getFlatters()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).flatters.push(makeFlatter(1))
    expect(sys.getFlatters()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).flatters.push(makeFlatter(1))
    expect(sys.getFlatters()).toBe((sys as any).flatters)
  })

  it('多个全部返回', () => {
    ;(sys as any).flatters.push(makeFlatter(1))
    ;(sys as any).flatters.push(makeFlatter(2))
    expect(sys.getFlatters()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFlatter(10)
    f.flattingSkill = 90; f.rollingPressure = 85; f.sheetUniformity = 80; f.thicknessControl = 75
    ;(sys as any).flatters.push(f)
    const r = sys.getFlatters()[0]
    expect(r.flattingSkill).toBe(90); expect(r.rollingPressure).toBe(85)
    expect(r.sheetUniformity).toBe(80); expect(r.thicknessControl).toBe(75)
  })
})
