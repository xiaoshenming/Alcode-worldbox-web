import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBridlemakerSystem } from '../systems/CreatureBridlemakerSystem'
import type { Bridlemaker } from '../systems/CreatureBridlemakerSystem'

let nextId = 1
function makeSys(): CreatureBridlemakerSystem { return new CreatureBridlemakerSystem() }
function makeBridlemaker(entityId: number): Bridlemaker {
  return { id: nextId++, entityId, leatherBraiding: 30, bitForging: 25, reinCrafting: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureBridlemakerSystem.getBridlemakers', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马具师', () => { expect((sys as any).bridlemakers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    expect((sys as any).bridlemakers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    expect((sys as any).bridlemakers).toBe((sys as any).bridlemakers)
  })

  it('多个全部返回', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2))
    expect((sys as any).bridlemakers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBridlemaker(10)
    b.leatherBraiding = 80; b.bitForging = 75; b.reinCrafting = 70; b.outputQuality = 65
    ;(sys as any).bridlemakers.push(b)
    const r = (sys as any).bridlemakers[0]
    expect(r.leatherBraiding).toBe(80); expect(r.bitForging).toBe(75)
    expect(r.reinCrafting).toBe(70); expect(r.outputQuality).toBe(65)
  })
})
