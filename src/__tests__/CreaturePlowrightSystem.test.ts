import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePlowrightSystem } from '../systems/CreaturePlowrightSystem'
import type { Plowright } from '../systems/CreaturePlowrightSystem'

let nextId = 1
function makeSys(): CreaturePlowrightSystem { return new CreaturePlowrightSystem() }
function makePlowright(entityId: number): Plowright {
  return { id: nextId++, entityId, ironForging: 70, bladeSharpening: 65, handleFitting: 75, outputQuality: 80, tick: 0 }
}

describe('CreaturePlowrightSystem.getPlowrights', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无犁制作者', () => { expect(sys.getPlowrights()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect(sys.getPlowrights()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect(sys.getPlowrights()).toBe((sys as any).plowrights)
  })
  it('字段正确', () => {
    ;(sys as any).plowrights.push(makePlowright(2))
    const p = sys.getPlowrights()[0]
    expect(p.ironForging).toBe(70)
    expect(p.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    ;(sys as any).plowrights.push(makePlowright(2))
    expect(sys.getPlowrights()).toHaveLength(2)
  })
})
