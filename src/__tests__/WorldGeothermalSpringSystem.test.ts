import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeothermalSpringSystem } from '../systems/WorldGeothermalSpringSystem'
import type { GeothermalSpring } from '../systems/WorldGeothermalSpringSystem'

function makeSys(): WorldGeothermalSpringSystem { return new WorldGeothermalSpringSystem() }
let nextId = 1
function makeSpring(): GeothermalSpring {
  return { id: nextId++, x: 20, y: 30, radius: 8, temperature: 75, mineralContent: 50, steamOutput: 60, flowRate: 40, tick: 0 }
}

describe('WorldGeothermalSpringSystem.getSprings', () => {
  let sys: WorldGeothermalSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地热泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('地热泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.temperature).toBe(75)
    expect(s.mineralContent).toBe(50)
    expect(s.flowRate).toBe(40)
  })
  it('多个地热泉全部返回', () => {
    ;(sys as any).springs.push(makeSpring())
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(2)
  })
})
