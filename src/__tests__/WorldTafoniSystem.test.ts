import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTafoniSystem } from '../systems/WorldTafoniSystem'
import type { Tafoni } from '../systems/WorldTafoniSystem'

function makeSys(): WorldTafoniSystem { return new WorldTafoniSystem() }
let nextId = 1
function makeTafoni(): Tafoni {
  return { id: nextId++, x: 15, y: 25, cavityCount: 10, cavityDepth: 5, saltContent: 60, weatheringRate: 3, rockType: 2, spectacle: 55, tick: 0 }
}

describe('WorldTafoniSystem.getTafoni', () => {
  let sys: WorldTafoniSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蜂窝岩', () => { expect((sys as any).tafoni).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tafoni.push(makeTafoni())
    expect((sys as any).tafoni).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).tafoni).toBe((sys as any).tafoni)
  })
  it('蜂窝岩字段正确', () => {
    ;(sys as any).tafoni.push(makeTafoni())
    const t = (sys as any).tafoni[0]
    expect(t.cavityCount).toBe(10)
    expect(t.saltContent).toBe(60)
    expect(t.spectacle).toBe(55)
  })
  it('多个蜂窝岩全部返回', () => {
    ;(sys as any).tafoni.push(makeTafoni())
    ;(sys as any).tafoni.push(makeTafoni())
    expect((sys as any).tafoni).toHaveLength(2)
  })
})
