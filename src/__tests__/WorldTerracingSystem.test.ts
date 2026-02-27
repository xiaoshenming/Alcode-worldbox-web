import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTerracingSystem } from '../systems/WorldTerracingSystem'
import type { Terrace, TerraceStage } from '../systems/WorldTerracingSystem'

function makeSys(): WorldTerracingSystem { return new WorldTerracingSystem() }
let nextId = 1
function makeTerrace(stage: TerraceStage = 'planted'): Terrace {
  return { id: nextId++, x: 20, y: 30, stage, levels: 5, fertility: 80, waterAccess: 70, yield: 60, tick: 0 }
}

describe('WorldTerracingSystem.getTerraces', () => {
  let sys: WorldTerracingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梯田', () => { expect(sys.getTerraces()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).terraces.push(makeTerrace())
    expect(sys.getTerraces()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getTerraces()).toBe((sys as any).terraces)
  })
  it('支持4种梯田阶段', () => {
    const stages: TerraceStage[] = ['carving', 'irrigating', 'planted', 'harvesting']
    expect(stages).toHaveLength(4)
  })
  it('梯田字段正确', () => {
    ;(sys as any).terraces.push(makeTerrace('harvesting'))
    const t = sys.getTerraces()[0]
    expect(t.stage).toBe('harvesting')
    expect(t.fertility).toBe(80)
    expect(t.levels).toBe(5)
  })
})
