import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEmbosserSystem } from '../systems/CreatureEmbosserSystem'
import type { Embosser } from '../systems/CreatureEmbosserSystem'

let nextId = 1
function makeSys(): CreatureEmbosserSystem { return new CreatureEmbosserSystem() }
function makeEmbosser(entityId: number): Embosser {
  return { id: nextId++, entityId, embossingSkill: 50, dieDesign: 40, pressureControl: 60, patternAccuracy: 70, tick: 0 }
}

describe('CreatureEmbosserSystem.getEmbossers', () => {
  let sys: CreatureEmbosserSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无压花工', () => { expect(sys.getEmbossers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).embossers.push(makeEmbosser(1))
    expect(sys.getEmbossers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).embossers.push(makeEmbosser(1))
    expect(sys.getEmbossers()).toBe((sys as any).embossers)
  })

  it('多个全部返回', () => {
    ;(sys as any).embossers.push(makeEmbosser(1))
    ;(sys as any).embossers.push(makeEmbosser(2))
    expect(sys.getEmbossers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const e = makeEmbosser(10)
    e.embossingSkill = 90; e.dieDesign = 85; e.pressureControl = 80; e.patternAccuracy = 75
    ;(sys as any).embossers.push(e)
    const r = sys.getEmbossers()[0]
    expect(r.embossingSkill).toBe(90); expect(r.dieDesign).toBe(85)
    expect(r.pressureControl).toBe(80); expect(r.patternAccuracy).toBe(75)
  })
})
