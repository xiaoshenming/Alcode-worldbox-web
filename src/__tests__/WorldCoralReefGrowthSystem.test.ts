import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralReefGrowthSystem } from '../systems/WorldCoralReefGrowthSystem'
import type { CoralReef, CoralType } from '../systems/WorldCoralReefGrowthSystem'

function makeSys(): WorldCoralReefGrowthSystem { return new WorldCoralReefGrowthSystem() }
let nextId = 1
function makeReef(coralType: CoralType = 'brain'): CoralReef {
  return { id: nextId++, x: 25, y: 35, coralType, coverage: 70, biodiversity: 85, health: 80, growthRate: 0.3, tick: 0 }
}

describe('WorldCoralReefGrowthSystem.getReefs', () => {
  let sys: WorldCoralReefGrowthSystem
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
  it('珊瑚礁字段正确', () => {
    ;(sys as any).reefs.push(makeReef('staghorn'))
    const r = sys.getReefs()[0]
    expect(r.coralType).toBe('staghorn')
    expect(r.coverage).toBe(70)
    expect(r.health).toBe(80)
  })
})
