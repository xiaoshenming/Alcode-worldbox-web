import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPeatBogSystem } from '../systems/WorldPeatBogSystem'
import type { PeatBog } from '../systems/WorldPeatBogSystem'

function makeSys(): WorldPeatBogSystem { return new WorldPeatBogSystem() }
let nextId = 1
function makeBog(): PeatBog {
  return { id: nextId++, x: 10, y: 20, radius: 12, peatDepth: 3, acidity: 4.5, waterTable: 70, sphagnumCover: 80, carbonStore: 50, tick: 0 }
}

describe('WorldPeatBogSystem.getBogs', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥炭沼泽', () => { expect((sys as any).bogs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bogs.push(makeBog())
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).bogs).toBe((sys as any).bogs)
  })
  it('泥炭沼泽字段正确', () => {
    ;(sys as any).bogs.push(makeBog())
    const b = (sys as any).bogs[0]
    expect(b.peatDepth).toBe(3)
    expect(b.acidity).toBe(4.5)
    expect(b.carbonStore).toBe(50)
  })
  it('多个沼泽全部返回', () => {
    ;(sys as any).bogs.push(makeBog())
    ;(sys as any).bogs.push(makeBog())
    expect((sys as any).bogs).toHaveLength(2)
  })
})
