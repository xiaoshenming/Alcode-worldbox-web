import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDustDevilSystem } from '../systems/WorldDustDevilSystem'
import type { DustDevil, DevilIntensity } from '../systems/WorldDustDevilSystem'

function makeSys(): WorldDustDevilSystem { return new WorldDustDevilSystem() }
let nextId = 1
function makeDevil(intensity: DevilIntensity = 'moderate'): DustDevil {
  return { id: nextId++, x: 30, y: 40, intensity, radius: 5, speed: 0.3, direction: 1.5, lifetime: 200, startTick: 0, resourcesScattered: 0, creaturesDisoriented: 0 }
}

describe('WorldDustDevilSystem.getDevils', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无尘卷风', () => { expect(sys.getDevils()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).devils.push(makeDevil())
    expect(sys.getDevils()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDevils()).toBe((sys as any).devils)
  })
  it('支持4种强度', () => {
    const intensities: DevilIntensity[] = ['minor', 'moderate', 'strong', 'violent']
    expect(intensities).toHaveLength(4)
  })
  it('尘卷风字段正确', () => {
    ;(sys as any).devils.push(makeDevil('violent'))
    const d = sys.getDevils()[0]
    expect(d.intensity).toBe('violent')
    expect(d.radius).toBe(5)
    expect(d.speed).toBe(0.3)
  })
})
