import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGorgeSystem } from '../systems/WorldGorgeSystem'
import type { Gorge } from '../systems/WorldGorgeSystem'

function makeSys(): WorldGorgeSystem { return new WorldGorgeSystem() }
let nextId = 1
function makeGorge(): Gorge {
  return { id: nextId++, x: 15, y: 25, length: 40, depth: 30, wallHeight: 25, riverFlow: 8, rockHardness: 7, spectacle: 75, tick: 0 }
}

describe('WorldGorgeSystem.getGorges', () => {
  let sys: WorldGorgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无峡谷', () => { expect((sys as any).gorges).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gorges.push(makeGorge())
    expect((sys as any).gorges).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).gorges).toBe((sys as any).gorges)
  })
  it('峡谷字段正确', () => {
    ;(sys as any).gorges.push(makeGorge())
    const g = (sys as any).gorges[0]
    expect(g.wallHeight).toBe(25)
    expect(g.riverFlow).toBe(8)
    expect(g.spectacle).toBe(75)
  })
  it('多个峡谷全部返回', () => {
    ;(sys as any).gorges.push(makeGorge())
    ;(sys as any).gorges.push(makeGorge())
    expect((sys as any).gorges).toHaveLength(2)
  })
})
