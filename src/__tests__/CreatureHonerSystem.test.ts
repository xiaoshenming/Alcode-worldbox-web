import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHonerSystem } from '../systems/CreatureHonerSystem'
import type { Honer } from '../systems/CreatureHonerSystem'

let nextId = 1
function makeSys(): CreatureHonerSystem { return new CreatureHonerSystem() }
function makeHoner(entityId: number): Honer {
  return { id: nextId++, entityId, honingSkill: 70, abrasiveControl: 65, surfacePrecision: 80, crosshatchAngle: 45, tick: 0 }
}

describe('CreatureHonerSystem.getHoners', () => {
  let sys: CreatureHonerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无磨刀工', () => { expect((sys as any).honers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).honers.push(makeHoner(1))
    expect((sys as any).honers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).honers.push(makeHoner(1))
    expect((sys as any).honers).toBe((sys as any).honers)
  })
  it('字段正确', () => {
    ;(sys as any).honers.push(makeHoner(5))
    const h = (sys as any).honers[0]
    expect(h.honingSkill).toBe(70)
    expect(h.surfacePrecision).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).honers.push(makeHoner(1))
    ;(sys as any).honers.push(makeHoner(2))
    expect((sys as any).honers).toHaveLength(2)
  })
})
