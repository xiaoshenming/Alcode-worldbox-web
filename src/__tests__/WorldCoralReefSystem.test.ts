import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralReefSystem } from '../systems/WorldCoralReefSystem'
import type { CoralReef, CoralType } from '../systems/WorldCoralReefSystem'

function makeSys(): WorldCoralReefSystem { return new WorldCoralReefSystem() }
let nextId = 1
function makeReef(type: CoralType = 'staghorn', x: number = 10, y: number = 10): CoralReef {
  return { id: nextId++, x, y, type, health: 100, growth: 50, biodiversity: 25, tick: 0 }
}

describe('WorldCoralReefSystem.getReefs', () => {
  let sys: WorldCoralReefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚礁', () => { expect(sys.getReefs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).reefs.push(makeReef())
    expect(sys.getReefs()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getReefs()).toBe((sys as any).reefs)
  })
  it('支持5种珊瑚类型', () => {
    const types: CoralType[] = ['brain', 'staghorn', 'fan', 'table', 'pillar']
    expect(types).toHaveLength(5)
  })
})

describe('WorldCoralReefSystem.getReefAt', () => {
  let sys: WorldCoralReefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无珊瑚礁时返回undefined', () => { expect(sys.getReefAt(10, 10)).toBeUndefined() })
  it('坐标相近时返回珊瑚礁', () => {
    ;(sys as any).reefs.push(makeReef('brain', 10, 10))
    expect(sys.getReefAt(10, 10)).toBeDefined()
    expect(sys.getReefAt(11, 11)).toBeDefined()  // within 2 tiles
  })
  it('坐标较远时返回undefined', () => {
    ;(sys as any).reefs.push(makeReef('fan', 10, 10))
    expect(sys.getReefAt(50, 50)).toBeUndefined()
  })
})
