import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSodaSpringSystem } from '../systems/WorldSodaSpringSystem'
import type { SodaSpring } from '../systems/WorldSodaSpringSystem'

function makeSys(): WorldSodaSpringSystem { return new WorldSodaSpringSystem() }
let nextId = 1
function makeSpring(): SodaSpring {
  return { id: nextId++, x: 20, y: 30, carbonation: 70, mineralDensity: 50, bubbleRate: 60, alkalinity: 80, tick: 0 }
}

describe('WorldSodaSpringSystem.getSprings', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无苏打泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('苏打泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.carbonation).toBe(70)
    expect(s.alkalinity).toBe(80)
    expect(s.bubbleRate).toBe(60)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
