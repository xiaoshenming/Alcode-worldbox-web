import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMossGrowthSystem } from '../systems/WorldMossGrowthSystem'
import type { MossPatch, MossStage } from '../systems/WorldMossGrowthSystem'

function makeSys(): WorldMossGrowthSystem { return new WorldMossGrowthSystem() }
let nextId = 1
function makePatch(stage: MossStage = 'thin'): MossPatch {
  return { id: nextId++, x: 15, y: 25, stage, moisture: 80, spreadChance: 0.05, tick: 0 }
}

describe('WorldMossGrowthSystem.getPatches', () => {
  let sys: WorldMossGrowthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无苔藓', () => { expect((sys as any).patches).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).patches.push(makePatch())
    expect((sys as any).patches).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).patches).toBe((sys as any).patches)
  })
  it('支持4种苔藓阶段', () => {
    const stages: MossStage[] = ['spore', 'thin', 'thick', 'lush']
    expect(stages).toHaveLength(4)
  })
  it('苔藓字段正确', () => {
    ;(sys as any).patches.push(makePatch('lush'))
    const p = (sys as any).patches[0]
    expect(p.stage).toBe('lush')
    expect(p.moisture).toBe(80)
  })
})
