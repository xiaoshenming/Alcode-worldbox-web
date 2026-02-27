import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSinkholePlainSystem } from '../systems/WorldSinkholePlainSystem'
import type { SinkholePlain } from '../systems/WorldSinkholePlainSystem'

function makeSys(): WorldSinkholePlainSystem { return new WorldSinkholePlainSystem() }
let nextId = 1
function makePlain(): SinkholePlain {
  return { id: nextId++, x: 20, y: 30, radius: 15, depth: 8, waterLevel: 3, collapseRisk: 40, vegetationRing: 60, tick: 0 }
}

describe('WorldSinkholePlainSystem.getPlains', () => {
  let sys: WorldSinkholePlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天坑平原', () => { expect(sys.getPlains()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plains.push(makePlain())
    expect(sys.getPlains()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPlains()).toBe((sys as any).plains)
  })
  it('天坑平原字段正确', () => {
    ;(sys as any).plains.push(makePlain())
    const p = sys.getPlains()[0]
    expect(p.collapseRisk).toBe(40)
    expect(p.vegetationRing).toBe(60)
    expect(p.waterLevel).toBe(3)
  })
})
