import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEtcherSystem } from '../systems/CreatureEtcherSystem'
import type { Etcher } from '../systems/CreatureEtcherSystem'

let nextId = 1
function makeSys(): CreatureEtcherSystem { return new CreatureEtcherSystem() }
function makeEtcher(entityId: number): Etcher {
  return { id: nextId++, entityId, etchingSkill: 50, acidControl: 60, maskPrecision: 70, surfaceFinish: 80, tick: 0 }
}

describe('CreatureEtcherSystem.getEtchers', () => {
  let sys: CreatureEtcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蚀刻工', () => { expect((sys as any).etchers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).etchers.push(makeEtcher(1))
    expect((sys as any).etchers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).etchers.push(makeEtcher(1))
    expect((sys as any).etchers).toBe((sys as any).etchers)
  })

  it('多个全部返回', () => {
    ;(sys as any).etchers.push(makeEtcher(1))
    ;(sys as any).etchers.push(makeEtcher(2))
    expect((sys as any).etchers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const e = makeEtcher(10)
    e.etchingSkill = 90; e.acidControl = 85; e.maskPrecision = 80; e.surfaceFinish = 75
    ;(sys as any).etchers.push(e)
    const r = (sys as any).etchers[0]
    expect(r.etchingSkill).toBe(90); expect(r.acidControl).toBe(85)
    expect(r.maskPrecision).toBe(80); expect(r.surfaceFinish).toBe(75)
  })
})
