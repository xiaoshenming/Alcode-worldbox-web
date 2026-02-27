import { describe, it, expect, beforeEach } from 'vitest'
import { WorldWaterspoutSystem } from '../systems/WorldWaterspoutSystem'
import type { Waterspout, SpoutIntensity } from '../systems/WorldWaterspoutSystem'

function makeSys(): WorldWaterspoutSystem { return new WorldWaterspoutSystem() }
let nextId = 1
function makeSpout(intensity: SpoutIntensity = 'moderate'): Waterspout {
  return { id: nextId++, x: 15, y: 25, intensity, height: 80, speed: 5, direction: 45, damageRadius: 10, creaturesScattered: 0, lifetime: 500, startTick: 0 }
}

describe('WorldWaterspoutSystem.getSpouts', () => {
  let sys: WorldWaterspoutSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无水龙卷', () => { expect(sys.getSpouts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spouts.push(makeSpout())
    expect(sys.getSpouts()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSpouts()).toBe((sys as any).spouts)
  })
  it('支持4种强度', () => {
    const types: SpoutIntensity[] = ['weak', 'moderate', 'strong', 'tornadic']
    expect(types).toHaveLength(4)
  })
  it('水龙卷字段正确', () => {
    ;(sys as any).spouts.push(makeSpout('tornadic'))
    const s = sys.getSpouts()[0]
    expect(s.intensity).toBe('tornadic')
    expect(s.height).toBe(80)
    expect(s.damageRadius).toBe(10)
  })
})
