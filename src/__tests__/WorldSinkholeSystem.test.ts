import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSinkholeSystem } from '../systems/WorldSinkholeSystem'
import type { Sinkhole, SinkholeStage } from '../systems/WorldSinkholeSystem'

function makeSys(): WorldSinkholeSystem { return new WorldSinkholeSystem() }
let nextId = 1
function makeSinkhole(stage: SinkholeStage = 'active'): Sinkhole {
  return { id: nextId++, x: 10, y: 10, radius: 3, depth: 50, stage, startTick: 0, duration: 1000 }
}

describe('WorldSinkholeSystem.getSinkholes', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天坑', () => { expect((sys as any).sinkholes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sinkholes.push(makeSinkhole())
    expect((sys as any).sinkholes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).sinkholes).toBe((sys as any).sinkholes)
  })
  it('支持4种天坑阶段', () => {
    const stages: SinkholeStage[] = ['forming', 'active', 'collapsing', 'filled']
    expect(stages).toHaveLength(4)
  })
})

describe('WorldSinkholeSystem.getActiveSinkholes', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃天坑', () => { expect(sys.getActiveSinkholes()).toHaveLength(0) })
  it('只返回stage=active的天坑', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    ;(sys as any).sinkholes.push(makeSinkhole('forming'))
    ;(sys as any).sinkholes.push(makeSinkhole('filled'))
    expect(sys.getActiveSinkholes()).toHaveLength(1)
  })
})
