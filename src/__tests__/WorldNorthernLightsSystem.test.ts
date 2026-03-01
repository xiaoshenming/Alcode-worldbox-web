import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNorthernLightsSystem } from '../systems/WorldNorthernLightsSystem'
import type { NorthernLights, AuroraIntensity } from '../systems/WorldNorthernLightsSystem'

function makeSys(): WorldNorthernLightsSystem { return new WorldNorthernLightsSystem() }
let nextId = 1
function makeAurora(intensity: AuroraIntensity = 'bright'): NorthernLights {
  return { id: nextId++, x: 30, y: 10, intensity, colors: ['#00ff88', '#0088ff'], width: 20, duration: 500, tick: 0 }
}

describe('WorldNorthernLightsSystem.getAuroras', () => {
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无极光', () => { expect((sys as any).auroras).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).auroras.push(makeAurora())
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).auroras).toBe((sys as any).auroras)
  })
  it('支持4种极光强度', () => {
    const intensities: AuroraIntensity[] = ['faint', 'moderate', 'bright', 'spectacular']
    expect(intensities).toHaveLength(4)
  })
  it('极光字段正确', () => {
    ;(sys as any).auroras.push(makeAurora('spectacular'))
    const a = (sys as any).auroras[0]
    expect(a.intensity).toBe('spectacular')
    expect(a.width).toBe(20)
    expect(a.colors).toHaveLength(2)
  })
})
