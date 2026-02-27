import { describe, it, expect, beforeEach } from 'vitest'
import { WorldOutlierSystem } from '../systems/WorldOutlierSystem'
import type { Outlier } from '../systems/WorldOutlierSystem'

function makeSys(): WorldOutlierSystem { return new WorldOutlierSystem() }
let nextId = 1
function makeOutlier(): Outlier {
  return { id: nextId++, x: 20, y: 30, area: 25, rockAge: 8000, surroundingAge: 2000, isolationDegree: 70, erosionVulnerability: 50, spectacle: 60, tick: 0 }
}

describe('WorldOutlierSystem.getOutliers', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无外露岩', () => { expect(sys.getOutliers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).outliers.push(makeOutlier())
    expect(sys.getOutliers()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getOutliers()).toBe((sys as any).outliers)
  })
  it('外露岩字段正确', () => {
    ;(sys as any).outliers.push(makeOutlier())
    const o = sys.getOutliers()[0]
    expect(o.isolationDegree).toBe(70)
    expect(o.spectacle).toBe(60)
    expect(o.rockAge).toBe(8000)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
