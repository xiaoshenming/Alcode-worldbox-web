import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCanyonSystem } from '../systems/WorldCanyonSystem'
import type { Canyon } from '../systems/WorldCanyonSystem'

function makeSys(): WorldCanyonSystem { return new WorldCanyonSystem() }
let nextId = 1
function makeCanyon(): Canyon {
  return { id: nextId++, x: 20, y: 30, length: 50, depth: 30, wallHeight: 40, riverFlow: 5, rockLayers: 8, widthAtTop: 20, tick: 0 }
}

describe('WorldCanyonSystem.getCanyons', () => {
  let sys: WorldCanyonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无峡谷', () => { expect(sys.getCanyons()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).canyons.push(makeCanyon())
    expect(sys.getCanyons()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getCanyons()).toBe((sys as any).canyons)
  })
  it('峡谷字段正确', () => {
    ;(sys as any).canyons.push(makeCanyon())
    const c = sys.getCanyons()[0]
    expect(c.depth).toBe(30)
    expect(c.wallHeight).toBe(40)
    expect(c.rockLayers).toBe(8)
  })
  it('多个峡谷全部返回', () => {
    ;(sys as any).canyons.push(makeCanyon())
    ;(sys as any).canyons.push(makeCanyon())
    expect(sys.getCanyons()).toHaveLength(2)
  })
})
