import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFrostbiteSystem } from '../systems/WorldFrostbiteSystem'
import type { FrostbiteZone, FrostbiteSeverity } from '../systems/WorldFrostbiteSystem'

function makeSys(): WorldFrostbiteSystem { return new WorldFrostbiteSystem() }
let nextId = 1
function makeZone(severity: FrostbiteSeverity = 'moderate'): FrostbiteZone {
  return { id: nextId++, x: 10, y: 5, severity, temperature: -20, radius: 8, duration: 300, active: true, tick: 0 }
}

describe('WorldFrostbiteSystem.getZones', () => {
  let sys: WorldFrostbiteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冻伤区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('支持4种严重程度', () => {
    const severities: FrostbiteSeverity[] = ['mild', 'moderate', 'severe', 'extreme']
    expect(severities).toHaveLength(4)
  })
  it('冻伤区字段正确', () => {
    ;(sys as any).zones.push(makeZone('extreme'))
    const z = sys.getZones()[0]
    expect(z.severity).toBe('extreme')
    expect(z.temperature).toBe(-20)
    expect(z.active).toBe(true)
  })
})
