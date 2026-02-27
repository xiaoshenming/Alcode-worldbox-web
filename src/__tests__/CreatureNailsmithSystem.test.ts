import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNailsmithSystem } from '../systems/CreatureNailsmithSystem'
import type { Nailsmith } from '../systems/CreatureNailsmithSystem'

let nextId = 1
function makeSys(): CreatureNailsmithSystem { return new CreatureNailsmithSystem() }
function makeNailsmith(entityId: number): Nailsmith {
  return { id: nextId++, entityId, ironDrawing: 70, headForming: 65, pointShaping: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureNailsmithSystem.getNailsmiths', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉工匠', () => { expect(sys.getNailsmiths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect(sys.getNailsmiths()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect(sys.getNailsmiths()).toBe((sys as any).nailsmiths)
  })
  it('字段正确', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(3))
    const n = sys.getNailsmiths()[0]
    expect(n.ironDrawing).toBe(70)
    expect(n.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    ;(sys as any).nailsmiths.push(makeNailsmith(2))
    expect(sys.getNailsmiths()).toHaveLength(2)
  })
})
