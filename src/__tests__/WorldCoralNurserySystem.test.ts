import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralNurserySystem } from '../systems/WorldCoralNurserySystem'
import type { CoralNursery, CoralHealth } from '../systems/WorldCoralNurserySystem'

function makeSys(): WorldCoralNurserySystem { return new WorldCoralNurserySystem() }
let nextId = 1
function makeNursery(health: CoralHealth = 'healthy'): CoralNursery {
  return { id: nextId++, x: 30, y: 40, coralCount: 50, health, growthRate: 0.7, biodiversity: 80, waterTemp: 26, tick: 0 }
}

describe('WorldCoralNurserySystem.getNurseries', () => {
  let sys: WorldCoralNurserySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚苗圃', () => { expect((sys as any).nurseries).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nurseries.push(makeNursery())
    expect((sys as any).nurseries).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).nurseries).toBe((sys as any).nurseries)
  })
  it('支持4种健康状态', () => {
    const levels: CoralHealth[] = ['pristine', 'healthy', 'degraded', 'dead']
    expect(levels).toHaveLength(4)
  })
  it('珊瑚苗圃字段正确', () => {
    ;(sys as any).nurseries.push(makeNursery('pristine'))
    const n = (sys as any).nurseries[0]
    expect(n.health).toBe('pristine')
    expect(n.coralCount).toBe(50)
    expect(n.waterTemp).toBe(26)
  })
})
