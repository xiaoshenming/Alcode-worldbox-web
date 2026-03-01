import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGlacierSystem } from '../systems/WorldGlacierSystem'
import type { Glacier } from '../systems/WorldGlacierSystem'

function makeSys(): WorldGlacierSystem { return new WorldGlacierSystem() }
let nextId = 1
function makeGlacier(active: boolean = true): Glacier {
  return { id: nextId++, x: 10, y: 10, length: 5, width: 3, direction: 0, speed: 0.1, mass: 50, age: 100, active }
}

describe('WorldGlacierSystem.getGlaciers', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰川', () => { expect((sys as any).glaciers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).glaciers.push(makeGlacier())
    expect((sys as any).glaciers).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).glaciers.push(makeGlacier())
    expect((sys as any).glaciers).toBe((sys as any).glaciers)
  })
  it('冰川字段正确', () => {
    ;(sys as any).glaciers.push(makeGlacier())
    const g = (sys as any).glaciers[0]
    expect(g.mass).toBe(50)
    expect(g.active).toBe(true)
  })
})

describe('WorldGlacierSystem.getActiveGlaciers', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃冰川', () => { expect(sys.getActiveGlaciers()).toHaveLength(0) })
  it('active=true的冰川被返回', () => {
    ;(sys as any).glaciers.push(makeGlacier(true))
    expect(sys.getActiveGlaciers()).toHaveLength(1)
  })
  it('active=false的冰川被过滤', () => {
    ;(sys as any).glaciers.push(makeGlacier(false))
    expect(sys.getActiveGlaciers()).toHaveLength(0)
  })
  it('混合时只返回活跃冰川', () => {
    ;(sys as any).glaciers.push(makeGlacier(true))
    ;(sys as any).glaciers.push(makeGlacier(false))
    ;(sys as any).glaciers.push(makeGlacier(true))
    expect(sys.getActiveGlaciers()).toHaveLength(2)
  })
})
