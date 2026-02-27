import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBurnOuterSystem } from '../systems/CreatureBurnOuterSystem'
import type { BurnOuter } from '../systems/CreatureBurnOuterSystem'

let nextId = 1
function makeSys(): CreatureBurnOuterSystem { return new CreatureBurnOuterSystem() }
function makeBurnOuter(entityId: number): BurnOuter {
  return { id: nextId++, entityId, burnOutSkill: 30, thermalControl: 25, cutPrecision: 20, materialRemoval: 35, tick: 0 }
}

describe('CreatureBurnOuterSystem.getBurnOuters', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无热切割师', () => { expect(sys.getBurnOuters()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect(sys.getBurnOuters()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect(sys.getBurnOuters()).toBe((sys as any).burnOuters)
  })

  it('多个全部返回', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    ;(sys as any).burnOuters.push(makeBurnOuter(2))
    expect(sys.getBurnOuters()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBurnOuter(10)
    b.burnOutSkill = 80; b.thermalControl = 75; b.cutPrecision = 70; b.materialRemoval = 65
    ;(sys as any).burnOuters.push(b)
    const r = sys.getBurnOuters()[0]
    expect(r.burnOutSkill).toBe(80); expect(r.thermalControl).toBe(75)
    expect(r.cutPrecision).toBe(70); expect(r.materialRemoval).toBe(65)
  })
})
