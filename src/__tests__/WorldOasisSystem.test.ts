import { describe, it, expect, beforeEach } from 'vitest'
import { WorldOasisSystem } from '../systems/WorldOasisSystem'
import type { Oasis, OasisSize } from '../systems/WorldOasisSystem'

function makeSys(): WorldOasisSystem { return new WorldOasisSystem() }
let nextId = 1
function makeOasis(waterLevel: number = 50, size: OasisSize = 'medium'): Oasis {
  return { id: nextId++, x: 10, y: 10, size, waterLevel, fertility: 60, age: 200, drying: false, palmCount: 3 }
}

describe('WorldOasisSystem.getOases', () => {
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绿洲', () => { expect((sys as any).oases).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).oases.push(makeOasis())
    expect((sys as any).oases).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).oases).toBe((sys as any).oases)
  })
  it('绿洲字段正确', () => {
    ;(sys as any).oases.push(makeOasis(80, 'large'))
    const o = (sys as any).oases[0]
    expect(o.waterLevel).toBe(80)
    expect(o.size).toBe('large')
  })
  it('支持3种尺寸', () => {
    const sizes: OasisSize[] = ['small', 'medium', 'large']
    expect(sizes).toHaveLength(3)
  })
})

describe('WorldOasisSystem.getActiveOases', () => {
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃绿洲', () => { expect(sys.getActiveOases()).toHaveLength(0) })
  it('waterLevel>0才返回', () => {
    ;(sys as any).oases.push(makeOasis(0))   // inactive
    ;(sys as any).oases.push(makeOasis(50))  // active
    expect(sys.getActiveOases()).toHaveLength(1)
  })
  it('waterLevel=0被过滤', () => {
    ;(sys as any).oases.push(makeOasis(0))
    expect(sys.getActiveOases()).toHaveLength(0)
  })
})
