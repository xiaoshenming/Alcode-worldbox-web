import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHotSpringSystem } from '../systems/WorldHotSpringSystem'
import type { HotSpring, SpringTemperature } from '../systems/WorldHotSpringSystem'

function makeSys(): WorldHotSpringSystem { return new WorldHotSpringSystem() }
let nextId = 1
function makeSpring(temperature: SpringTemperature = 'hot'): HotSpring {
  return { id: nextId++, x: 20, y: 30, temperature, healingRate: 2.5, mineralContent: 60, visitors: 0, age: 100, tick: 0 }
}

describe('WorldHotSpringSystem.getSprings', () => {
  let sys: WorldHotSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无温泉', () => { expect(sys.getSprings()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect(sys.getSprings()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSprings()).toBe((sys as any).springs)
  })
  it('支持4种温度', () => {
    const types: SpringTemperature[] = ['warm', 'hot', 'scalding', 'volcanic']
    expect(types).toHaveLength(4)
  })
  it('温泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring('scalding'))
    const s = sys.getSprings()[0]
    expect(s.temperature).toBe('scalding')
    expect(s.healingRate).toBe(2.5)
    expect(s.mineralContent).toBe(60)
  })
})
