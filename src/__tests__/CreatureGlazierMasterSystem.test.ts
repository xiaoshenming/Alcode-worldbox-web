import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlazierMasterSystem } from '../systems/CreatureGlazierMasterSystem'
import type { GlazierMaster } from '../systems/CreatureGlazierMasterSystem'

let nextId = 1
function makeSys(): CreatureGlazierMasterSystem { return new CreatureGlazierMasterSystem() }
function makeMaster(entityId: number): GlazierMaster {
  return { id: nextId++, entityId, glassCutting: 50, leadWork: 60, colorMixing: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureGlazierMasterSystem.getMasters', () => {
  let sys: CreatureGlazierMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玻璃大师', () => { expect(sys.getMasters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).masters.push(makeMaster(1))
    expect(sys.getMasters()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).masters.push(makeMaster(1))
    expect(sys.getMasters()).toBe((sys as any).masters)
  })
  it('多个全部返回', () => {
    ;(sys as any).masters.push(makeMaster(1))
    ;(sys as any).masters.push(makeMaster(2))
    expect(sys.getMasters()).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const m = makeMaster(10)
    m.glassCutting = 90; m.leadWork = 85; m.colorMixing = 80; m.outputQuality = 75
    ;(sys as any).masters.push(m)
    const r = sys.getMasters()[0]
    expect(r.glassCutting).toBe(90); expect(r.leadWork).toBe(85)
    expect(r.colorMixing).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
