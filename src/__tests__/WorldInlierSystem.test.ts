import { describe, it, expect, beforeEach } from 'vitest'
import { WorldInlierSystem } from '../systems/WorldInlierSystem'
import type { Inlier } from '../systems/WorldInlierSystem'

function makeSys(): WorldInlierSystem { return new WorldInlierSystem() }
let nextId = 1
function makeInlier(): Inlier {
  return { id: nextId++, x: 20, y: 30, area: 30, rockAge: 5000, surroundingAge: 1000, exposureDepth: 5, geologicalValue: 80, spectacle: 65, tick: 0 }
}

describe('WorldInlierSystem.getInliers', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无内露岩', () => { expect(sys.getInliers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).inliers.push(makeInlier())
    expect(sys.getInliers()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getInliers()).toBe((sys as any).inliers)
  })
  it('内露岩字段正确', () => {
    ;(sys as any).inliers.push(makeInlier())
    const i = sys.getInliers()[0]
    expect(i.geologicalValue).toBe(80)
    expect(i.spectacle).toBe(65)
    expect(i.rockAge).toBe(5000)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
