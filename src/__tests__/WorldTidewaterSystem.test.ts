import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidewaterSystem } from '../systems/WorldTidewaterSystem'
import type { TideZone, TidePhase } from '../systems/WorldTidewaterSystem'

function makeSys(): WorldTidewaterSystem { return new WorldTidewaterSystem() }
let nextId = 1
function makeZone(phase: TidePhase = 'high'): TideZone {
  return { id: nextId++, x: 20, y: 30, phase, level: 80, maxLevel: 100, cycleSpeed: 0.1, radius: 10, tick: 0 }
}

describe('WorldTidewaterSystem.getZones', () => {
  let sys: WorldTidewaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮水区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('支持4种潮汐阶段', () => {
    const phases: TidePhase[] = ['rising', 'high', 'falling', 'low']
    expect(phases).toHaveLength(4)
  })
  it('潮水区字段正确', () => {
    ;(sys as any).zones.push(makeZone('low'))
    const z = sys.getZones()[0]
    expect(z.phase).toBe('low')
    expect(z.level).toBe(80)
    expect(z.radius).toBe(10)
  })
})
