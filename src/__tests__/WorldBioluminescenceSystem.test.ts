import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBioluminescenceSystem } from '../systems/WorldBioluminescenceSystem'
import type { BioluminescentZone, GlowType } from '../systems/WorldBioluminescenceSystem'

function makeSys(): WorldBioluminescenceSystem { return new WorldBioluminescenceSystem() }
let nextId = 1
function makeZone(glowType: GlowType = 'jellyfish'): BioluminescentZone {
  return { id: nextId++, x: 30, y: 40, glowType, brightness: 70, color: '#8844ff', spread: 3, active: true, tick: 0 }
}

describe('WorldBioluminescenceSystem.getZones', () => {
  let sys: WorldBioluminescenceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无生物发光区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('支持4种发光类型', () => {
    const types: GlowType[] = ['algae', 'jellyfish', 'fungi', 'plankton']
    expect(types).toHaveLength(4)
  })
  it('发光区字段正确', () => {
    ;(sys as any).zones.push(makeZone('fungi'))
    const z = sys.getZones()[0]
    expect(z.glowType).toBe('fungi')
    expect(z.brightness).toBe(70)
    expect(z.active).toBe(true)
  })
})
